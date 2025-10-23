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

const isVariableDeclaratorMatches = (variableDeclarator, predicate) => {
	if (!(
		variableDeclarator.id.type === 'Identifier'
		&& predicate(variableDeclarator.init)
	)) {
		return false;
	}

	const variableDeclaration = variableDeclarator.parent;
	if (!(
		variableDeclaration.type === 'VariableDeclaration'
		&& variableDeclaration.kind === 'const'
		&& variableDeclaration.declarations.at(-1) === variableDeclarator
	)) {
		return false;
	}

	return true;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	// Array
	context.on('VariableDeclarator', variableDeclarator => {
		if (!isVariableDeclaratorMatches(variableDeclarator, init => init?.type === 'ArrayExpression')) {
			return;
		}

		const variableDeclaration = variableDeclarator.parent;
		const expressionStatement = getNextNode(variableDeclaration, sourceCode);
		if (expressionStatement?.type !== 'ExpressionStatement') {
			return;
		}

		const variableName = variableDeclarator.id.name;
		let callExpression = expressionStatement.expression;
		if (callExpression.type === 'ChainExpression') {
			callExpression = callExpression.expression;
		}

		if (!(
			isMethodCall(callExpression, {object: variableName, methods: ['push', 'unshift']})
			&& callExpression.arguments.length > 0
		)) {
			return;
		}

		const variable = getVariable(variableDeclarator, context);

		/* c8 ignore next */
		if (!variable) {
			return;
		}

		if (hasVariableInNodes(variable, callExpression.arguments, context)) {
			return;
		}

		const method = callExpression.callee.property;
		const problem = {
			node: method,
			messageId: MESSAGE_ID_ERROR,
			data: {description: 'array'},
		};

		const isPrepend = method.name === 'unshift';

		const fix = function * (fixer) {
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

			yield removeExpressionStatement(expressionStatement, fixer, context);

			const tokenBefore = sourceCode.getTokenBefore(expressionStatement);
			const tokenAfter = sourceCode.getTokenAfter(expressionStatement);
			if (tokenAfter && needsSemicolon(tokenBefore, sourceCode, tokenAfter.value)) {
				yield fixer.insertTextBefore(tokenAfter, ';');
			}
		};

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
	});

	// Object
	context.on('VariableDeclarator', variableDeclarator => {
		if (!isVariableDeclaratorMatches(variableDeclarator, init => init?.type === 'ObjectExpression')) {
			return;
		}

		const variableDeclaration = variableDeclarator.parent;
		const expressionStatement = getNextNode(variableDeclaration, sourceCode);
		if (expressionStatement?.type !== 'ExpressionStatement') {
			return;
		}

		const variableName = variableDeclarator.id.name;
		const assignmentExpression = expressionStatement.expression;
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
		const variable = getVariable(variableDeclarator, context);

		/* c8 ignore next */
		if (!variable) {
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

		const problem = {
			node: property,
			messageId: MESSAGE_ID_ERROR,
			data: {description: 'object'},
		};

		const fix = function * (fixer) {
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

			yield removeExpressionStatement(expressionStatement, fixer, context);

			const tokenBefore = sourceCode.getTokenBefore(expressionStatement);
			const tokenAfter = sourceCode.getTokenAfter(expressionStatement);
			if (tokenAfter && needsSemicolon(tokenBefore, sourceCode, tokenAfter.value)) {
				yield fixer.insertTextBefore(tokenAfter, ';');
			}
		};

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
