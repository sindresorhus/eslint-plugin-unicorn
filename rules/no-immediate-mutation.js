import {hasSideEffect, isCommaToken, isSemicolonToken} from '@eslint-community/eslint-utils';
import {
	isMethodCall,
	isMemberExpression,
	isNewExpression,
} from './ast/index.js';
import {removeExpressionStatement} from './fix/index.js';
import {
	getNextNode,
	getCallExpressionArgumentsText,
	getParenthesizedText,
	getVariableIdentifiers,
	getNewExpressionTokens,
	isNewExpressionWithParentheses,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_SUGGESTION_ARRAY = 'suggestion/array';
const MESSAGE_ID_SUGGESTION_OBJECT = 'suggestion/object';
const MESSAGE_ID_SUGGESTION_SET = 'suggestion/set';
const MESSAGE_ID_SUGGESTION_MAP = 'suggestion/map';
const messages = {
	[MESSAGE_ID_ERROR]: 'Immediate mutation on {{description}} is not allowed.',
	[MESSAGE_ID_SUGGESTION_ARRAY]: '{{operation}} the elements to declaration.',
	[MESSAGE_ID_SUGGESTION_OBJECT]: 'Move this property to declaration.',
	[MESSAGE_ID_SUGGESTION_SET]: 'Move the element to declaration.',
	[MESSAGE_ID_SUGGESTION_MAP]: 'Move the entry to declaration.',
};

const getVariable = (variableDeclarator, context) =>
	context.sourceCode.getDeclaredVariables(variableDeclarator)
		.find(variable => variable.defs.length === 1 && variable.defs[0].name === variableDeclarator.id);
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

function * removeExpressionStatementAfterDeclaration(expressionStatement, context, fixer) {
	const tokenBefore = context.sourceCode.getTokenBefore(expressionStatement);
	const shouldPreserveSemiColon = !isSemicolonToken(tokenBefore);
	yield removeExpressionStatement(expressionStatement, context, fixer, shouldPreserveSemiColon);
}

function appendElementsTextToArrayExpression(context, fixer, arrayExpression, elementsText) {
	const {sourceCode} = context;
	const [
		penultimateToken,
		closingBracketToken,
	] = sourceCode.getLastTokens(arrayExpression, 2);
	const shouldInsertComma = arrayExpression.elements.length > 0 && !isCommaToken(penultimateToken);

	return fixer.insertTextBefore(
		closingBracketToken,
		`${shouldInsertComma ? ',' : ''} ${elementsText}`,
	);
}

function * appendElementsTextToSetConstructor({
	context,
	fixer,
	newExpression,
	elementsText,
	expressionStatementAfterDeclaration,
}) {
	if (isNewExpressionWithParentheses(newExpression, context)) {
		const [setInitialValue] = newExpression.arguments;
		if (setInitialValue) {
			yield appendElementsTextToArrayExpression(context, fixer, setInitialValue, elementsText);
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

	yield * removeExpressionStatementAfterDeclaration(expressionStatementAfterDeclaration, context, fixer);
}

// `Array`
const arrayMutationSettings = {
	testDeclarator: variableDeclarator => variableDeclarator.init?.type === 'ArrayExpression',
	getProblematicNode({
		context,
		variableName,
		variable,
		expressionStatementAfterDeclaration,
	}) {
		let callExpression = expressionStatementAfterDeclaration.expression;
		if (callExpression.type === 'ChainExpression') {
			callExpression = callExpression.expression;
		}

		if (!(
			isMethodCall(callExpression, {object: variableName, methods: ['push', 'unshift']})
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
			getFix,
		} = information;
		const {sourceCode} = context;
		const memberExpression = callExpression.callee;
		const method = memberExpression.property;
		const problem = {
			node: memberExpression,
			messageId: MESSAGE_ID_ERROR,
			data: {description: 'array'},
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
					data: {operation: isPrepend ? 'Prepend' : 'Append'},
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
			variableDeclarator,
			expressionStatementAfterDeclaration,
		},
		{
			callExpression,
			isPrepend,
		},
	) => function * (fixer) {
		const arrayExpression = variableDeclarator.init;
		const text = getCallExpressionArgumentsText(context, callExpression, /* includeTrailingComma */ false);

		yield (isPrepend
			? fixer.insertTextAfter(
				context.sourceCode.getFirstToken(arrayExpression),
				`${text}, `,
			)
			: appendElementsTextToArrayExpression(context, fixer, arrayExpression, text));

		yield * removeExpressionStatementAfterDeclaration(
			expressionStatementAfterDeclaration,
			context,
			fixer,
		);
	},
};

// `Object`
const objectMutationSettings = {
	testDeclarator: variableDeclarator => variableDeclarator.init?.type === 'ObjectExpression',
	getProblematicNode({
		context,
		variableName,
		variable,
		expressionStatementAfterDeclaration,
	}) {
		const assignmentExpression = expressionStatementAfterDeclaration.expression;
		if (!(
			assignmentExpression.type === 'AssignmentExpression'
			&& assignmentExpression.operator === '='
			&& isMemberExpression(assignmentExpression.left, {object: variableName, optional: false})
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
			data: {description: 'object'},
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
			variableDeclarator,
			expressionStatementAfterDeclaration,
		},
		{
			memberExpression,
			property,
			value,
		},
	) => function * (fixer) {
		const objectExpression = variableDeclarator.init;

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

		yield * removeExpressionStatementAfterDeclaration(
			expressionStatementAfterDeclaration,
			context,
			fixer,
		);
	},
};

// `Set` and `WeakSet`
const setMutationSettings = {
	testDeclarator: variableDeclarator => isCallExpressionWithOptionalArrayExpression(variableDeclarator.init, ['Set', 'WeakSet']),
	getProblematicNode({
		context,
		variableName,
		variable,
		expressionStatementAfterDeclaration,
	}) {
		let callExpression = expressionStatementAfterDeclaration.expression;
		if (callExpression.type === 'ChainExpression') {
			callExpression = callExpression.expression;
		}

		if (!isMethodCall(callExpression, {object: variableName, method: 'add', argumentsLength: 1})) {
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
			getFix,
			variableDeclarator,
		} = information;
		const {sourceCode} = context;
		const memberExpression = callExpression.callee;
		const newExpression = variableDeclarator.init;
		const problem = {
			node: memberExpression,
			messageId: MESSAGE_ID_ERROR,
			data: {description: `\`${newExpression.callee.name}\``},
		};

		const fix = getFix(information, {
			callExpression,
			newExpression,
		});

		if (callExpression.arguments.some(element => hasSideEffect(element, sourceCode))) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION_SET,
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
			expressionStatementAfterDeclaration,
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
			expressionStatementAfterDeclaration,
		});
	},
};

// `Map` and `WeakMap`
const mapMutationSettings = {
	testDeclarator: variableDeclarator => isCallExpressionWithOptionalArrayExpression(variableDeclarator.init, ['Map', 'WeakMap']),
	getProblematicNode({
		context,
		variableName,
		variable,
		expressionStatementAfterDeclaration,
	}) {
		let callExpression = expressionStatementAfterDeclaration.expression;
		if (callExpression.type === 'ChainExpression') {
			callExpression = callExpression.expression;
		}

		if (!isMethodCall(callExpression, {object: variableName, method: 'set', argumentsLength: 2})) {
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
			getFix,
			variableDeclarator,
		} = information;
		const {sourceCode} = context;
		const memberExpression = callExpression.callee;
		const newExpression = variableDeclarator.init;
		const problem = {
			node: memberExpression,
			messageId: MESSAGE_ID_ERROR,
			data: {description: `\`${newExpression.callee.name}\``},
		};

		const fix = getFix(information, {
			callExpression,
			newExpression,
		});

		if (callExpression.arguments.some(element => hasSideEffect(element, sourceCode))) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION_MAP,
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
			expressionStatementAfterDeclaration,
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
			expressionStatementAfterDeclaration,
		});
	},
};

const cases = [
	arrayMutationSettings,
	objectMutationSettings,
	setMutationSettings,
	mapMutationSettings,
];

function getCaseProblem(
	context,
	variableDeclarator,
	{
		testDeclarator,
		getProblematicNode,
		getProblem,
		getFix,
	},
) {
	if (!(
		variableDeclarator.id.type === 'Identifier'
		&& testDeclarator(variableDeclarator)
	)) {
		return;
	}

	const variableDeclaration = variableDeclarator.parent;
	if (!(
		variableDeclaration.type === 'VariableDeclaration'
		&& variableDeclaration.declarations.at(-1) === variableDeclarator
	)) {
		return;
	}

	const expressionStatementAfterDeclaration = getNextNode(variableDeclaration, context);
	if (expressionStatementAfterDeclaration?.type !== 'ExpressionStatement') {
		return;
	}

	const variableName = variableDeclarator.id.name;
	const variable = getVariable(variableDeclarator, context);

	/* c8 ignore next */
	if (!variable) {
		return;
	}

	const information = {
		context,
		variableName,
		variable,
		variableDeclarator,
		variableDeclaration,
		expressionStatementAfterDeclaration,
		getFix,
	};

	const problemNode = getProblematicNode(information);

	if (!problemNode) {
		return;
	}

	return getProblem(problemNode, information);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('VariableDeclarator', function * (variableDeclarator) {
		for (const caseSettings of cases) {
			yield getCaseProblem(context, variableDeclarator, caseSettings);
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow immediate mutation after declaration.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
