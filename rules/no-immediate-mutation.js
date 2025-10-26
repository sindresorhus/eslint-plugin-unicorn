import {
	hasSideEffect,
	isCommaToken,
	isSemicolonToken,
	findVariable,
} from '@eslint-community/eslint-utils';
import {
	isMethodCall,
	isMemberExpression,
	isNewExpression,
} from './ast/index.js';
import {
	removeExpressionStatement,
	removeArgument,
} from './fix/index.js';
import {
	getNextNode,
	getCallExpressionArgumentsText,
	getParenthesizedText,
	getVariableIdentifiers,
	getNewExpressionTokens,
	isNewExpressionWithParentheses,
} from './utils/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_SUGGESTION_ARRAY = 'suggestion/array';
const MESSAGE_ID_SUGGESTION_OBJECT = 'suggestion/object';
const MESSAGE_ID_SUGGESTION_OBJECT_ASSIGN = 'suggestion/object-assign';
const MESSAGE_ID_SUGGESTION_SET = 'suggestion/set';
const MESSAGE_ID_SUGGESTION_MAP = 'suggestion/map';
const messages = {
	[MESSAGE_ID_ERROR]: 'Immediate mutation on {{objectType}} is not allowed.',
	[MESSAGE_ID_SUGGESTION_ARRAY]: '{{operation}} the elements to the {{assignType}}.',
	[MESSAGE_ID_SUGGESTION_OBJECT]: 'Move this property to the {{assignType}}.',
	[MESSAGE_ID_SUGGESTION_OBJECT_ASSIGN]: '{{description}} the {{assignType}}.',
	[MESSAGE_ID_SUGGESTION_SET]: 'Move the element to the {{assignType}}.',
	[MESSAGE_ID_SUGGESTION_MAP]: 'Move the entry to the {{assignType}}.',
};

const hasVariableInNodes = (variable, nodes, context) => {
	const {sourceCode} = context;
	const identifiers = getVariableIdentifiers(variable);
	return nodes.some(node => {
		const range = sourceCode.getRange(node);
		return identifiers.some(identifier => {
			const [start, end] = sourceCode.getRange(identifier);
			return start >= range[0] && end <= range[1];
		});
	});
};

function isCallExpressionWithOptionalArrayExpression(newExpression, names) {
	if (!isNewExpression(
		newExpression,
		{names, maximumArguments: 1},
	)) {
		return false;
	}

	// `new Set();` and `new Set([]);`
	const [iterable] = newExpression.arguments;
	return (!iterable || iterable.type === 'ArrayExpression');
}

function * removeExpressionStatementAfterAssign(expressionStatement, context, fixer) {
	const tokenBefore = context.sourceCode.getTokenBefore(expressionStatement);
	const shouldPreserveSemiColon = !isSemicolonToken(tokenBefore);
	yield removeExpressionStatement(expressionStatement, context, fixer, shouldPreserveSemiColon);
}

function appendListTextToArrayExpressionOrObjectExpression(
	context,
	fixer,
	arrayOrObjectExpression,
	listText,
) {
	const {sourceCode} = context;
	const [
		penultimateToken,
		closingBracketToken,
	] = sourceCode.getLastTokens(arrayOrObjectExpression, 2);
	const list = arrayOrObjectExpression.type === 'ArrayExpression'
		? arrayOrObjectExpression.elements
		: arrayOrObjectExpression.properties;
	const shouldInsertComma = list.length > 0 && !isCommaToken(penultimateToken);

	return fixer.insertTextBefore(
		closingBracketToken,
		`${shouldInsertComma ? ',' : ''} ${listText}`,
	);
}

function * appendElementsTextToSetConstructor({
	context,
	fixer,
	newExpression,
	elementsText,
	nextExpressionStatement,
}) {
	if (isNewExpressionWithParentheses(newExpression, context)) {
		const [setInitialValue] = newExpression.arguments;
		if (setInitialValue) {
			yield appendListTextToArrayExpressionOrObjectExpression(context, fixer, setInitialValue, elementsText);
		} else {
			const {
				openingParenthesisToken,
			} = getNewExpressionTokens(newExpression, context);
			yield fixer.insertTextAfter(openingParenthesisToken, `[${elementsText}]`);
		}
	} else {
		/*
		The new expression doesn't have parentheses
		```
		const set = (( new (( Set )) ));
		set.add(1);
		```
		*/
		yield fixer.insertTextAfter(newExpression, `([${elementsText}])`);
	}

	yield * removeExpressionStatementAfterAssign(nextExpressionStatement, context, fixer);
}

function getObjectExpressionPropertiesText(objectExpression, context) {
	const {sourceCode} = context;
	const openingBraceToken = sourceCode.getFirstToken(objectExpression);
	const [penultimateToken, closingBraceToken] = sourceCode.getLastTokens(objectExpression, 2);
	const [, start] = sourceCode.getRange(openingBraceToken);
	const [end] = sourceCode.getRange(isCommaToken(penultimateToken) ? penultimateToken : closingBraceToken);
	return sourceCode.text.slice(start, end);
}

/**
@typedef {ESTree.VariableDeclarator['init'] | ESTree.AssignmentExpression['right']} ValueNode
@typedef {(information: ViolationCaseInformation, arguments: any)} GetFix
@typedef {Parameters<ESLint.Rule.RuleContext['report']>[0]} Problem
@typedef {(information: ViolationCaseInformation) => ESTree.Node} GetProblematicNode
@typedef {{
	context: ESLint.Rule.RuleContext,
	variable: ESLint.Scope.Variable,
	variableNode: ESTree.Identifier,
	valueNode: ValueNode,
	statement: ESTree.VariableDeclaration | ESTree.ExpressionStatement,
	nextExpressionStatement: ESTree.ExpressionStatement,
	assignType: 'assignment' | 'declaration',
	getFix: GetFix,
}} ViolationCaseInformation
@typedef {{
	testValue: (value: ValueNode) => boolean,
	getProblematicNode: GetProblematicNode,
	getProblem: (node: ReturnType<GetProblematicNode>, information: ViolationCaseInformation) => Problem,
	getFix: GetFix,
}} ViolationCase
*/

// `Array`
/** @type {ViolationCase} */
const arrayMutationSettings = {
	testValue: value => value?.type === 'ArrayExpression',
	getProblematicNode({
		context,
		variable,
		nextExpressionStatement,
	}) {
		const callExpression = nextExpressionStatement.expression;

		if (!(
			isMethodCall(callExpression, {
				object: variable.name,
				methods: ['push', 'unshift'],
				optionalMember: false,
				optionalCall: false,
			})
			&& callExpression.arguments.length > 0
		)) {
			return;
		}

		if (hasVariableInNodes(variable, callExpression.arguments, context)) {
			return;
		}

		return callExpression;
	},
	getProblem(callExpression, information) {
		const {
			context,
			assignType,
			getFix,
		} = information;
		const {sourceCode} = context;
		const memberExpression = callExpression.callee;
		const method = memberExpression.property;
		const problem = {
			node: memberExpression,
			messageId: MESSAGE_ID_ERROR,
			data: {objectType: 'array'},
		};

		const isPrepend = method.name === 'unshift';
		const fix = getFix(information, {
			callExpression,
			isPrepend,
		});

		if (callExpression.arguments.some(element => hasSideEffect(element, sourceCode))) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION_ARRAY,
					fix,
					data: {operation: isPrepend ? 'Prepend' : 'Append', assignType},
				},
			];
		} else {
			problem.fix = fix;
		}

		return problem;
	},
	getFix: (
		{
			context,
			valueNode: arrayExpression,
			nextExpressionStatement,
		},
		{
			callExpression,
			isPrepend,
		},
	) => function * (fixer) {
		const text = getCallExpressionArgumentsText(context, callExpression, /* includeTrailingComma */ false);

		yield (
			isPrepend
				? fixer.insertTextAfter(
					context.sourceCode.getFirstToken(arrayExpression),
					`${text}, `,
				)
				: appendListTextToArrayExpressionOrObjectExpression(context, fixer, arrayExpression, text)
		);

		yield * removeExpressionStatementAfterAssign(
			nextExpressionStatement,
			context,
			fixer,
		);
	},
};

// `Object` + `AssignmentExpression`
/** @type {ViolationCase} */
const objectWithAssignmentExpressionSettings = {
	testValue: value => value?.type === 'ObjectExpression',
	getProblematicNode({
		context,
		variable,
		nextExpressionStatement,
	}) {
		const assignmentExpression = nextExpressionStatement.expression;
		if (!(
			assignmentExpression.type === 'AssignmentExpression'
			&& assignmentExpression.operator === '='
			&& isMemberExpression(assignmentExpression.left, {object: variable.name, optional: false})
		)) {
			return;
		}

		const value = assignmentExpression.right;
		const memberExpression = assignmentExpression.left;
		const {property} = memberExpression;

		if (
			hasVariableInNodes(
				variable,
				memberExpression.computed ? [property, value] : [value],
				context,
			)
		) {
			return;
		}

		return assignmentExpression;
	},
	getProblem(assignmentExpression, information) {
		const {
			context,
			assignType,
			getFix,
		} = information;
		const {sourceCode} = context;
		const {
			left: memberExpression,
			right: value,
		} = assignmentExpression;

		const {property} = memberExpression;
		const operatorToken = sourceCode.getTokenAfter(memberExpression, token => token.type === 'Punctuator' && token.value === assignmentExpression.operator);

		const problem = {
			node: assignmentExpression,
			loc: {
				start: sourceCode.getLoc(assignmentExpression).start,
				end: sourceCode.getLoc(operatorToken).end,
			},
			messageId: MESSAGE_ID_ERROR,
			data: {objectType: 'object'},
		};
		const fix = getFix(information, {
			assignmentExpression,
			memberExpression,
			property,
			value,
		});

		if (
			(memberExpression.computed && hasSideEffect(property, sourceCode))
			|| hasSideEffect(value, sourceCode)
		) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION_OBJECT,
					data: {assignType},
					fix,
				},
			];
		} else {
			problem.fix = fix;
		}

		return problem;
	},
	getFix: (
		{
			context,
			valueNode: objectExpression,
			nextExpressionStatement,
		},
		{
			memberExpression,
			property,
			value,
		},
	) => function * (fixer) {
		let propertyText = getParenthesizedText(property, context);
		if (memberExpression.computed) {
			propertyText = `[${propertyText}]`;
		}

		const valueText = getParenthesizedText(value, context);

		const text = `${propertyText}: ${valueText},`;
		const [
			penultimateToken,
			closingBraceToken,
		] = context.sourceCode.getLastTokens(objectExpression, 2);
		const shouldInsertComma = objectExpression.properties.length > 0 && !isCommaToken(penultimateToken);

		yield fixer.insertTextBefore(
			closingBraceToken,
			`${shouldInsertComma ? ',' : ''} ${text}`,
		);

		yield * removeExpressionStatementAfterAssign(
			nextExpressionStatement,
			context,
			fixer,
		);
	},
};

// `Object` + `Object.assign()`
/** @type {ViolationCase} */
const objectWithObjectAssignSettings = {
	testValue: value => value?.type === 'ObjectExpression',
	getProblematicNode({
		context,
		variable,
		nextExpressionStatement,
	}) {
		const callExpression = nextExpressionStatement.expression;

		if (!isMethodCall(callExpression, {
			object: 'Object',
			method: 'assign',
			minimumArguments: 2,
			optionalMember: false,
			optionalCall: false,
		})) {
			return;
		}

		const [object, firstValue] = callExpression.arguments;

		if (
			!(object.type === 'Identifier' && object.name === variable.name)
			|| firstValue.type === 'SpreadElement'
			|| hasVariableInNodes(variable, [firstValue], context)
		) {
			return;
		}

		return callExpression;
	},
	getProblem(callExpression, information) {
		const {
			context,
			assignType,
			getFix,
		} = information;
		const {sourceCode} = context;
		const [, firstValue] = callExpression.arguments;

		const problem = {
			node: callExpression.callee,
			messageId: MESSAGE_ID_ERROR,
			data: {objectType: 'object'},
		};
		const fix = getFix(information, {
			callExpression,
			firstValue,
		});

		if (hasSideEffect(firstValue, sourceCode)) {
			const description = firstValue.type === 'ObjectExpression'
				? 'Move properties to'
				: 'Spread properties in';

			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION_OBJECT_ASSIGN,
					data: {description, assignType},
					fix,
				},
			];
		} else {
			problem.fix = fix;
		}

		return problem;
	},
	getFix: (
		{
			context,
			valueNode: objectExpression,
			nextExpressionStatement,
		},
		{
			callExpression,
			firstValue,
		},
	) => function * (fixer) {
		let text;
		if (firstValue.type === 'ObjectExpression') {
			if (firstValue.properties.length > 0) {
				text = getObjectExpressionPropertiesText(firstValue, context);
			}
		} else {
			text = `...${getParenthesizedText(firstValue, context)}`;
		}

		if (text) {
			yield appendListTextToArrayExpressionOrObjectExpression(context, fixer, objectExpression, text);
		}

		if (callExpression.arguments.length !== 2) {
			yield removeArgument(fixer, firstValue, context);

			return;
		}

		yield * removeExpressionStatementAfterAssign(
			nextExpressionStatement,
			context,
			fixer,
		);
	},
};

// `Set` and `WeakSet`
/** @type {ViolationCase} */
const setMutationSettings = {
	testValue: value => isCallExpressionWithOptionalArrayExpression(value, ['Set', 'WeakSet']),
	getProblematicNode({
		context,
		variable,
		nextExpressionStatement,
	}) {
		let callExpression = nextExpressionStatement.expression;
		if (callExpression.type === 'ChainExpression') {
			callExpression = callExpression.expression;
		}

		if (!isMethodCall(callExpression, {
			object: variable.name,
			method: 'add',
			argumentsLength: 1,
			optionalMember: false,
			optionalCall: false,
		})) {
			return;
		}

		if (hasVariableInNodes(variable, callExpression.arguments, context)) {
			return;
		}

		return callExpression;
	},
	getProblem(callExpression, information) {
		const {
			context,
			assignType,
			valueNode: newExpression,
			getFix,
		} = information;
		const {sourceCode} = context;
		const memberExpression = callExpression.callee;
		const problem = {
			node: memberExpression,
			messageId: MESSAGE_ID_ERROR,
			data: {objectType: `\`${newExpression.callee.name}\``},
		};

		const fix = getFix(information, {
			callExpression,
			newExpression,
		});

		if (callExpression.arguments.some(element => hasSideEffect(element, sourceCode))) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION_SET,
					data: {assignType},
					fix,
				},
			];
		} else {
			problem.fix = fix;
		}

		return problem;
	},
	getFix: (
		{
			context,
			nextExpressionStatement,
		},
		{
			callExpression,
			newExpression,
		},
	) => fixer => {
		const elementsText = getCallExpressionArgumentsText(
			context,
			callExpression,
			/* IncludeTrailingComma */ false,
		);
		return appendElementsTextToSetConstructor({
			context,
			fixer,
			newExpression,
			elementsText,
			nextExpressionStatement,
		});
	},
};

// `Map` and `WeakMap`
/** @type {ViolationCase} */
const mapMutationSettings = {
	testValue: value => isCallExpressionWithOptionalArrayExpression(value, ['Map', 'WeakMap']),
	getProblematicNode({
		context,
		variable,
		nextExpressionStatement,
	}) {
		const callExpression = nextExpressionStatement.expression;

		if (!isMethodCall(callExpression, {
			object: variable.name,
			method: 'set',
			argumentsLength: 2,
			optionalCall: false,
		})) {
			return;
		}

		if (hasVariableInNodes(variable, callExpression.arguments, context)) {
			return;
		}

		return callExpression;
	},
	getProblem(callExpression, information) {
		const {
			context,
			assignType,
			valueNode: newExpression,
			getFix,
		} = information;
		const {sourceCode} = context;
		const memberExpression = callExpression.callee;
		const problem = {
			node: memberExpression,
			messageId: MESSAGE_ID_ERROR,
			data: {objectType: `\`${newExpression.callee.name}\``},
		};

		const fix = getFix(information, {
			callExpression,
			newExpression,
		});

		if (callExpression.arguments.some(element => hasSideEffect(element, sourceCode))) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION_MAP,
					data: {assignType},
					fix,
				},
			];
		} else {
			problem.fix = fix;
		}

		return problem;
	},
	getFix: (
		{
			context,
			nextExpressionStatement,
		},
		{
			callExpression,
			newExpression,
		},
	) => fixer => {
		const argumentsText = getCallExpressionArgumentsText(
			context,
			callExpression,
			/* IncludeTrailingComma */ false,
		);
		const entryText = `[${argumentsText}]`;
		return appendElementsTextToSetConstructor({
			context,
			fixer,
			newExpression,
			elementsText: entryText,
			nextExpressionStatement,
		});
	},
};

const cases = [
	arrayMutationSettings,
	objectWithAssignmentExpressionSettings,
	objectWithObjectAssignSettings,
	setMutationSettings,
	mapMutationSettings,
];

function isLastDeclarator(variableDeclarator) {
	const variableDeclaration = variableDeclarator.parent;
	return (
		variableDeclaration.type === 'VariableDeclaration'
		&& variableDeclaration.declarations.at(-1) === variableDeclarator
	);
}

const getVariable = (node, context) => {
	if (node.type === 'VariableDeclarator') {
		return context.sourceCode.getDeclaredVariables(node)
			.find(variable => variable.defs.length === 1 && variable.defs[0].name === node.id);
	}

	return findVariable(context.sourceCode.getScope(node), node.left.name);
};

function getCaseProblem(
	context,
	assignNode,
	{
		testValue,
		getProblematicNode,
		getProblem,
		getFix,
	},
) {
	const isAssignment = assignNode.type === 'AssignmentExpression';
	const [variableNode, valueNode] = (isAssignment ? ['left', 'right'] : ['id', 'init'])
		.map(property => assignNode[property]);

	// eslint-disable-next-line no-warning-comments
	// TODO[@fisker]: `AssignmentExpression` should not limit to `Identifier`
	if (!(variableNode.type === 'Identifier' && testValue(valueNode))) {
		return;
	}

	const statement = assignNode.parent;

	if (!(
		// eslint-disable-next-line no-warning-comments
		// TODO[@fisker]: `AssignmentExpression` should support `a = b = c` too
		(
			isAssignment
			&& assignNode.operator === '='
			&& statement.type === 'ExpressionStatement'
			&& statement.expression === assignNode)
		|| (!isAssignment && isLastDeclarator(assignNode))
	)) {
		return;
	}

	const nextExpressionStatement = getNextNode(statement, context);
	if (nextExpressionStatement?.type !== 'ExpressionStatement') {
		return;
	}

	const variable = getVariable(assignNode, context);
	/* c8 ignore next */
	if (!variable) {
		return;
	}

	const information = {
		context,
		variable,
		variableNode,
		valueNode,
		statement,
		nextExpressionStatement,
		assignType: isAssignment ? 'assignment' : 'declaration',
		getFix,
	};

	const problematicNode = getProblematicNode(information);

	if (!problematicNode) {
		return;
	}

	return getProblem(problematicNode, information);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	for (const caseSettings of cases) {
		context.on(
			[
				'VariableDeclarator',
				'AssignmentExpression',
			],
			assignNode => getCaseProblem(context, assignNode, caseSettings),
		);
	}
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow immediate mutation after variable assignment.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
