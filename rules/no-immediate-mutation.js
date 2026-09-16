import {
	hasSideEffect,
	isCommaToken,
	isSemicolonToken,
	findVariable,
	getPropertyName,
} from '@eslint-community/eslint-utils';
import {
	isMethodCall,
	isMemberExpression,
	isNewExpression,
} from './ast/index.js';
import {
	removeStatement,
	removeArgument,
} from './fix/index.js';
import {
	getNextNode,
	getCallExpressionArgumentsText,
	getParenthesizedText,
	getVariableIdentifiers,
	getNewExpressionTokens,
	isNewExpressionWithParentheses,
	isTypeScriptFile,
	needsSemicolon,
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
const MESSAGE_ID_SUGGESTION_CONDITIONAL = 'suggestion/conditional';
const messages = {
	[MESSAGE_ID_ERROR]: 'Immediate mutation on {{objectType}} is not allowed.',
	[MESSAGE_ID_SUGGESTION_ARRAY]: '{{operation}} the elements to the {{assignType}}.',
	[MESSAGE_ID_SUGGESTION_OBJECT]: 'Move this property to the {{assignType}}.',
	[MESSAGE_ID_SUGGESTION_OBJECT_ASSIGN]: '{{description}} the {{assignType}}.',
	[MESSAGE_ID_SUGGESTION_SET]: 'Move the element to the {{assignType}}.',
	[MESSAGE_ID_SUGGESTION_MAP]: 'Move the entry to the {{assignType}}.',
	[MESSAGE_ID_SUGGESTION_CONDITIONAL]: 'Move the conditional mutation to the {{assignType}}.',
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

function * removeStatementAfterAssign(statement, context, fixer) {
	const tokenBefore = context.sourceCode.getTokenBefore(statement);
	if (statement.type === 'IfStatement') {
		const tokenAfter = context.sourceCode.getTokenAfter(statement);
		if (tokenAfter && needsSemicolon(tokenBefore, context, tokenAfter.value)) {
			yield fixer.insertTextAfter(tokenBefore, ';');
		}

		yield removeStatement(statement, context, fixer);
		return;
	}

	const shouldPreserveSemiColon = !isSemicolonToken(tokenBefore);
	yield removeStatement(statement, context, fixer, shouldPreserveSemiColon);
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
	nextStatement,
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

	yield * removeStatementAfterAssign(nextStatement, context, fixer);
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
@typedef {(information: ViolationCaseInformation & {expression: ESTree.Expression}) => ESTree.Node} GetProblematicNode
@typedef {{
	context: ESLint.Rule.RuleContext,
	variable: ESLint.Scope.Variable,
	valueNode: ValueNode,
	nextStatement: ESTree.ExpressionStatement | ESTree.IfStatement,
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
/**
@type {ViolationCase}
*/
const arrayMutationSettings = {
	testValue: value => value?.type === 'ArrayExpression',
	getProblematicNode({
		context,
		variable,
		expression: callExpression,
	}) {
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
			nextStatement,
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

		yield removeStatementAfterAssign(
			nextStatement,
			context,
			fixer,
		);
	},
};

// `Object` + `AssignmentExpression`
/**
@type {ViolationCase}
*/
const objectWithAssignmentExpressionSettings = {
	testValue: value => value?.type === 'ObjectExpression',
	getProblematicNode({
		context,
		variable,
		expression: assignmentExpression,
	}) {
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
		if (property.type === 'PrivateIdentifier') {
			return;
		}

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
			nextStatement,
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

		yield removeStatementAfterAssign(
			nextStatement,
			context,
			fixer,
		);
	},
};

// `Object` + `Object.assign()`
/**
@type {ViolationCase}
*/
const objectWithObjectAssignSettings = {
	testValue: value => value?.type === 'ObjectExpression',
	getProblematicNode({
		context,
		variable,
		expression: callExpression,
	}) {
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
			nextStatement,
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

		yield removeStatementAfterAssign(
			nextStatement,
			context,
			fixer,
		);
	},
};

// `Set` and `WeakSet`
/**
@type {ViolationCase}
*/
const setMutationSettings = {
	testValue: value => isCallExpressionWithOptionalArrayExpression(value, ['Set', 'WeakSet']),
	getProblematicNode({
		context,
		variable,
		expression,
	}) {
		let callExpression = expression;
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
			nextStatement,
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
			nextStatement,
		});
	},
};

// `Map` and `WeakMap`
/**
@type {ViolationCase}
*/
const mapMutationSettings = {
	testValue: value => isCallExpressionWithOptionalArrayExpression(value, ['Map', 'WeakMap']),
	getProblematicNode({
		context,
		variable,
		expression: callExpression,
	}) {
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
			nextStatement,
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
			nextStatement,
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

function getBranchExpression(statement) {
	if (statement.type === 'BlockStatement' && statement.body.length === 1) {
		[statement] = statement.body;
	}

	if (statement.type === 'ExpressionStatement') {
		return statement.expression;
	}
}

function getConditionalMutation(statement) {
	if (statement.type === 'IfStatement') {
		const consequent = getBranchExpression(statement.consequent);
		const alternate = statement.alternate && getBranchExpression(statement.alternate);
		if (consequent && (!statement.alternate || alternate)) {
			return {test: statement.test, consequent, alternate};
		}

		return;
	}

	const {expression} = statement;
	if (expression?.type === 'ConditionalExpression') {
		return expression;
	}

	if (expression?.type === 'LogicalExpression' && expression.operator === '&&') {
		return {test: expression.left, consequent: expression.right};
	}
}

function getConditionalBranch(node, information, caseSettings) {
	const {context} = information;
	const problematicNode = caseSettings.getProblematicNode({
		...information,
		expression: node,
	});
	if (!problematicNode) {
		return;
	}

	if (caseSettings === objectWithAssignmentExpressionSettings) {
		const {left: memberExpression, right: value} = problematicNode;
		const {property, computed} = memberExpression;
		const propertyText = getParenthesizedText(property, context);
		return {
			text: `{${computed ? `[${propertyText}]` : propertyText}: ${getParenthesizedText(value, context)}}`,
			inputs: computed ? [property, value] : [value],
			canFix: getPropertyName(memberExpression, context.sourceCode.getScope(memberExpression)) !== '__proto__',
		};
	}

	if (caseSettings === objectWithObjectAssignSettings) {
		if (problematicNode.arguments.length !== 2) {
			return;
		}

		const source = problematicNode.arguments[1];
		const hasStaticPrototypeProperty = source.type === 'ObjectExpression'
			&& source.properties.some(property => property.type === 'Property' && getPropertyName(property, context.sourceCode.getScope(property)) === '__proto__');
		return {text: getParenthesizedText(source, context), inputs: [source], canFix: !hasStaticPrototypeProperty};
	}

	const argumentsText = getCallExpressionArgumentsText(context, problematicNode, /* includeTrailingComma */ false);
	return {
		text: caseSettings === mapMutationSettings ? `[[${argumentsText}]]` : `[${argumentsText}]`,
		inputs: problematicNode.arguments,
		method: problematicNode.callee.property.name,
	};
}

function hasCommentsThatWouldBeRelocated(statement, sourceCode) {
	const {end: statementEnd} = sourceCode.getLoc(statement);
	return sourceCode.getCommentsInside(statement).length > 0
		|| sourceCode.getCommentsBefore(statement).length > 0
		|| sourceCode.getCommentsAfter(statement).some(comment => sourceCode.getLoc(comment).start.line === statementEnd.line);
}

function getConditionalProblem(conditional, information, caseSettings) {
	const {context, variable, valueNode, nextStatement, assignType} = information;
	const {sourceCode} = context;
	if (hasVariableInNodes(variable, [conditional.test], context)) {
		return;
	}

	const consequent = getConditionalBranch(conditional.consequent, information, caseSettings);
	const alternate = conditional.alternate && getConditionalBranch(conditional.alternate, information, caseSettings);
	if (
		!consequent
		|| (conditional.alternate && !alternate)
		|| (alternate && consequent.method !== alternate.method)
	) {
		return;
	}

	const isObject = valueNode.type === 'ObjectExpression';
	let objectType = isObject ? 'object' : 'array';
	if (valueNode.type === 'NewExpression') {
		objectType = `\`${valueNode.callee.name}\``;
	}

	const problem = {
		node: nextStatement,
		messageId: MESSAGE_ID_ERROR,
		data: {objectType},
	};
	const hasUnfixableBranch = [consequent, alternate].some(branch => branch?.canFix === false);
	// Conditional spreads lose contextual typing for tuples, literal unions, and callbacks.
	if (
		isTypeScriptFile(context.physicalFilename)
		|| sourceCode.parserServices.esTreeNodeToTSNodeMap
		|| hasCommentsThatWouldBeRelocated(nextStatement, sourceCode)
		|| hasUnfixableBranch
	) {
		return problem;
	}

	const isPrepend = consequent.method === 'unshift';
	const fix = function * (fixer) {
		const testText = getParenthesizedText(conditional.test, context);
		const text = `...((${testText}) ? ${consequent.text} : ${alternate?.text ?? (isObject ? '{}' : '[]')})`;
		if (valueNode.type === 'NewExpression') {
			yield appendElementsTextToSetConstructor({
				context,
				fixer,
				newExpression: valueNode,
				elementsText: text,
				nextStatement,
			});
			return;
		}

		yield isPrepend
			? fixer.insertTextAfter(sourceCode.getFirstToken(valueNode), `${text}, `)
			: appendListTextToArrayExpressionOrObjectExpression(context, fixer, valueNode, text);
		yield removeStatementAfterAssign(nextStatement, context, fixer);
	};

	const inputs = [conditional.test, ...consequent.inputs, ...(alternate?.inputs ?? [])];
	if (
		inputs.some(node => hasSideEffect(node, sourceCode))
		|| (isPrepend && valueNode.elements.length > 0)
	) {
		problem.suggest = [{messageId: MESSAGE_ID_SUGGESTION_CONDITIONAL, data: {assignType}, fix}];
	} else {
		problem.fix = fix;
	}

	return problem;
}

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
	caseSettings,
) {
	const {testValue, getProblematicNode, getProblem, getFix} = caseSettings;
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

	const nextStatement = getNextNode(statement, context);
	if (!['ExpressionStatement', 'IfStatement'].includes(nextStatement?.type)) {
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
		valueNode,
		nextStatement,
		assignType: isAssignment ? 'assignment' : 'declaration',
		getFix,
	};
	const conditional = getConditionalMutation(nextStatement);
	if (conditional) {
		if (!context.options[0].checkConditionals) {
			return;
		}

		return getConditionalProblem(conditional, information, caseSettings);
	}

	if (nextStatement.type !== 'ExpressionStatement') {
		return;
	}

	const problematicNode = getProblematicNode({
		...information,
		expression: nextStatement.expression,
	});

	if (!problematicNode) {
		return;
	}

	return getProblem(problematicNode, information);
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
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

/**
@type {import('eslint').Rule.RuleModule}
*/
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
		schema: [
			{
				type: 'object',
				properties: {
					checkConditionals: {
						type: 'boolean',
						description: 'Whether to check conditional mutations.',
					},
				},
				additionalProperties: false,
			},
		],
		defaultOptions: [{checkConditionals: false}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
