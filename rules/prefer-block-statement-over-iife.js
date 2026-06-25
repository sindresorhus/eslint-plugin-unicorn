import {isSemicolonToken} from '@eslint-community/eslint-utils';
import {isDirective, isFunction} from './ast/index.js';
import {wouldRemoveComments} from './utils/index.js';

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

const isNestedFunction = (node, root) =>
	node !== root && isFunction(node);

const isNestedNonArrowFunction = (node, root) =>
	isNestedFunction(node, root)
	&& node.type !== 'ArrowFunctionExpression';

function containsNodeMatching(node, visitorKeys, predicate, shouldSkip = isNestedFunction) {
	const root = node;

	function containsMatch(node) {
		if (predicate(node)) {
			return true;
		}

		if (shouldSkip(node, root)) {
			return false;
		}

		for (const key of visitorKeys[node.type] ?? []) {
			const child = node[key];
			const children = Array.isArray(child) ? child : [child];

			for (const childNode of children) {
				if (childNode?.type && containsMatch(childNode)) {
					return true;
				}
			}
		}

		return false;
	}

	return containsMatch(node);
}

const hasFunctionOnlyBehavior = (body, visitorKeys) => containsNodeMatching(body, visitorKeys, node =>
	node.type === 'ReturnStatement'
	|| (node.type === 'VariableDeclaration' && node.kind === 'var')
	|| isDirectEvalCall(node),
);

const hasFunctionContextReference = (body, visitorKeys) =>
	containsNodeMatching(body, visitorKeys, isFunctionContextReference, isNestedNonArrowFunction);

const hasScriptFunctionDeclaration = (body, sourceCode) =>
	sourceCode.ast.sourceType === 'script'
	&& containsNodeMatching(body, sourceCode.visitorKeys, node => node.type === 'FunctionDeclaration');

const getReplacementRange = (expressionStatement, sourceCode) => {
	const [start, end] = sourceCode.getRange(expressionStatement);
	const lastToken = sourceCode.getLastToken(expressionStatement);
	const rangeEnd = isSemicolonToken(lastToken) ? sourceCode.getRange(lastToken)[1] : end;

	return [start, rangeEnd];
};

const hasWrapperComment = (expressionStatement, body, context) =>
	wouldRemoveComments(context, getReplacementRange(expressionStatement, context.sourceCode), [body]);

const getFix = (expressionStatement, body, context) => fixer =>
	fixer.replaceTextRange(
		getReplacementRange(expressionStatement, context.sourceCode),
		context.sourceCode.getText(body),
	);

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const {visitorKeys} = sourceCode;

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
			|| hasFunctionOnlyBehavior(callee.body, visitorKeys)
			|| hasScriptFunctionDeclaration(callee.body, sourceCode)
			|| hasWrapperComment(expressionStatement, callee.body, context)
			|| (
				callee.type === 'FunctionExpression'
				&& hasFunctionContextReference(callee.body, visitorKeys)
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
