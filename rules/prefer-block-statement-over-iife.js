import {isSemicolonToken} from '@eslint-community/eslint-utils';
import {isDirective, isFunction} from './ast/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'prefer-block-statement-over-iife';
const messages = {
	[MESSAGE_ID]: 'Prefer a block statement over an IIFE used only for scoping.',
};

const isDirectEvalCall = node =>
	node.type === 'CallExpression'
	&& node.callee.type === 'Identifier'
	&& node.callee.name === 'eval';

const isFunctionContextReference = node =>
	node.type === 'ThisExpression'
	|| (
		node.type === 'MetaProperty'
		&& node.meta.name === 'new'
		&& node.property.name === 'target'
	)
	|| (node.type === 'Identifier' && node.name === 'arguments');

function containsNodeMatching(node, visitorKeys, predicate, root = node) {
	if (node !== root && isFunction(node)) {
		return false;
	}

	if (predicate(node)) {
		return true;
	}

	for (const key of visitorKeys[node.type] ?? []) {
		const child = node[key];
		const children = Array.isArray(child) ? child : [child];

		for (const childNode of children) {
			if (childNode?.type && containsNodeMatching(childNode, visitorKeys, predicate, root)) {
				return true;
			}
		}
	}

	return false;
}

function containsFunctionContextReference(node, visitorKeys, root = node) {
	if (
		node !== root
		&& isFunction(node)
		&& node.type !== 'ArrowFunctionExpression'
	) {
		return false;
	}

	if (isFunctionContextReference(node)) {
		return true;
	}

	for (const key of visitorKeys[node.type] ?? []) {
		const child = node[key];
		const children = Array.isArray(child) ? child : [child];

		for (const childNode of children) {
			if (childNode?.type && containsFunctionContextReference(childNode, visitorKeys, root)) {
				return true;
			}
		}
	}

	return false;
}

function containsFunctionDeclaration(node, visitorKeys, root = node) {
	if (node.type === 'FunctionDeclaration') {
		return true;
	}

	if (node !== root && isFunction(node)) {
		return false;
	}

	for (const key of visitorKeys[node.type] ?? []) {
		const child = node[key];
		const children = Array.isArray(child) ? child : [child];

		for (const childNode of children) {
			if (childNode?.type && containsFunctionDeclaration(childNode, visitorKeys, root)) {
				return true;
			}
		}
	}

	return false;
}

const hasFunctionOnlyStatement = (body, visitorKeys) => containsNodeMatching(body, visitorKeys, node =>
	node.type === 'ReturnStatement'
	|| (node.type === 'VariableDeclaration' && node.kind === 'var')
	|| isDirectEvalCall(node),
);

const hasFunctionContextReference = (body, visitorKeys) =>
	containsFunctionContextReference(body, visitorKeys);

const hasScriptBlockFunctionDeclaration = (body, sourceCode) =>
	sourceCode.ast.sourceType === 'script'
	&& containsFunctionDeclaration(body, sourceCode.visitorKeys);

const hasWrapperComment = (expressionStatement, body, sourceCode) => {
	const [bodyStart, bodyEnd] = sourceCode.getRange(body);

	return sourceCode.getCommentsInside(expressionStatement).some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return commentStart < bodyStart || commentEnd > bodyEnd;
	});
};

const getFix = (expressionStatement, body, context) => fixer => {
	const {sourceCode} = context;
	const [, end] = sourceCode.getRange(expressionStatement);
	const lastToken = sourceCode.getLastToken(expressionStatement);
	const rangeEnd = isSemicolonToken(lastToken) ? sourceCode.getRange(lastToken)[1] : end;

	return fixer.replaceTextRange(
		[
			sourceCode.getRange(expressionStatement)[0],
			rangeEnd,
		],
		sourceCode.getText(body),
	);
};

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('ExpressionStatement', expressionStatement => {
		const {expression} = expressionStatement;

		if (
			expression.type !== 'CallExpression'
			|| expression.optional
			|| expression.arguments.length > 0
		) {
			return;
		}

		const {callee} = expression;
		if (
			(
				callee.type !== 'FunctionExpression'
				&& callee.type !== 'ArrowFunctionExpression'
			)
			|| callee.id
			|| callee.async
			|| callee.generator
			|| callee.params.length > 0
			|| callee.body.type !== 'BlockStatement'
			|| callee.body.body.some(statement => isDirective(statement))
			|| hasFunctionOnlyStatement(callee.body, sourceCode.visitorKeys)
			|| hasScriptBlockFunctionDeclaration(callee.body, sourceCode)
			|| hasWrapperComment(expressionStatement, callee.body, sourceCode)
			|| (
				callee.type === 'FunctionExpression'
				&& hasFunctionContextReference(callee.body, sourceCode.visitorKeys)
			)
		) {
			return;
		}

		return {
			node: expression,
			messageId: MESSAGE_ID,
			fix: getFix(expressionStatement, callee.body, context),
		};
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer block statements over IIFEs used only for scoping.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
