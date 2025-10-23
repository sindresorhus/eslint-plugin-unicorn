import {hasSideEffect, isCommaToken} from '@eslint-community/eslint-utils';
import {
	isMethodCall,
	isMemberExpression,
} from './ast/index.js';
import {removeExpressionStatement} from './fix/index.js';
import {
	getNextNode,
	getCallExpressionArgumentsText,
	getParenthesizedText,
	getVariableIdentifiers,
	needsSemicolon,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_ARRAY_SUGGESTION = 'suggestion/array';
const MESSAGE_ID_OBJECT_SUGGESTION = 'suggestion/object';
const messages = {
	[MESSAGE_ID_ERROR]: 'Immediate mutation on {{description}} is not allowed.',
	[MESSAGE_ID_ARRAY_SUGGESTION]: '{{operation}} elements to declaration.',
	[MESSAGE_ID_OBJECT_SUGGESTION]: 'Move property to declaration.',
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

function * removeExpressionStatementAfterDeclaration(context, fixer, expressionStatement, variableDeclaration) {
	yield removeExpressionStatement(expressionStatement, fixer, context);

	const {sourceCode} = context;
	const tokenBefore = sourceCode.getTokenBefore(variableDeclaration);
	const tokenAfter = sourceCode.getTokenAfter(expressionStatement);
	if (tokenAfter && needsSemicolon(tokenBefore, sourceCode, tokenAfter.value)) {
		yield fixer.insertTextBefore(tokenAfter, ';');
	}
}

const cases = [
	// Array
	{
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
			const method = callExpression.callee.property;
			const problem = {
				node: method,
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
						messageId: MESSAGE_ID_ARRAY_SUGGESTION,
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
				variableDeclaration,
				expressionStatementAfterDeclaration,
			},
			{
				callExpression,
				isPrepend,
			},
		) => function * (fixer) {
			const {sourceCode} = context;
			const arrayExpression = variableDeclarator.init;

			if (isPrepend) {
				const text = getCallExpressionArgumentsText(sourceCode, callExpression, /* includeTrailingComma */ false);

				yield fixer.insertTextAfter(
					sourceCode.getFirstToken(arrayExpression),
					`${text}, `,
				);
			} else {
				const text = getCallExpressionArgumentsText(sourceCode, callExpression);
				const [
					penultimateToken,
					closingBracketToken,
				] = sourceCode.getLastTokens(arrayExpression, 2);
				const shouldInsertComma = arrayExpression.elements.length > 0 && !isCommaToken(penultimateToken);

				yield fixer.insertTextBefore(
					closingBracketToken,
					`${shouldInsertComma ? ',' : ''} ${text}`,
				);
			}

			yield * removeExpressionStatementAfterDeclaration(
				context,
				fixer,
				expressionStatementAfterDeclaration,
				variableDeclaration,
			);
		},
	},
	// Object
	{
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

			const problem = {
				node: property,
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
						messageId: MESSAGE_ID_OBJECT_SUGGESTION,
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
				variableDeclaration,
				expressionStatementAfterDeclaration,
			},
			{
				memberExpression,
				property,
				value,
			},
		) => function * (fixer) {
			const {sourceCode} = context;
			const objectExpression = variableDeclarator.init;

			let propertyText = getParenthesizedText(property, sourceCode);
			if (memberExpression.computed) {
				propertyText = `[${propertyText}]`;
			}

			const valueText = getParenthesizedText(value, sourceCode);

			const text = `${propertyText}: ${valueText},`;
			const [
				penultimateToken,
				closingBraceToken,
			] = sourceCode.getLastTokens(objectExpression, 2);
			const shouldInsertComma = objectExpression.properties.length > 0 && !isCommaToken(penultimateToken);

			yield fixer.insertTextBefore(
				closingBraceToken,
				`${shouldInsertComma ? ',' : ''} ${text}`,
			);

			yield * removeExpressionStatementAfterDeclaration(
				context,
				fixer,
				expressionStatementAfterDeclaration,
				variableDeclaration,
			);
		},
	},
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
		&& variableDeclaration.kind === 'const'
		&& variableDeclaration.declarations.at(-1) === variableDeclarator
	)) {
		return;
	}

	const expressionStatementAfterDeclaration = getNextNode(variableDeclaration, context.sourceCode);
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
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
