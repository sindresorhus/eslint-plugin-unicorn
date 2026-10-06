import {isDirectEvalCall, isDirective, isFunction} from './ast/index.js';
import {containsNode, getCommentSafeProblem} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'prefer-block-statement-over-iife';
const messages = {
	[MESSAGE_ID]: 'Prefer a block statement over an IIFE used only for scoping.',
};

const isFunctionContextReference = node =>
	node.type === 'ThisExpression'
	|| (
		node.type === 'MetaProperty'
		&& node.meta.name === 'new'
		&& node.property.name === 'target'
	)
	|| (node.type === 'Identifier' && node.name === 'arguments');

const isNonArrowFunction = node =>
	isFunction(node)
	&& node.type !== 'ArrowFunctionExpression';

const isFunctionOnlyBehavior = node =>
	node.type === 'ReturnStatement'
	|| (node.type === 'VariableDeclaration' && node.kind === 'var')
	|| isDirectEvalCall(node);

const hasFunctionOnlyBehavior = (body, context) =>
	containsNode(body, context, isFunctionOnlyBehavior, isFunction);

const hasFunctionContextReference = (body, context) =>
	containsNode(body, context, isFunctionContextReference, isNonArrowFunction);

const hasScriptFunctionDeclaration = (body, context) =>
	context.sourceCode.ast.sourceType === 'script'
	&& containsNode(body, context, node => node.type === 'FunctionDeclaration', isFunction);

const getFix = (expressionStatement, body, context) => fixer =>
	fixer.replaceText(expressionStatement, context.sourceCode.getText(body));

/**
@param {ESLint.Rule.RuleContext} context
*/
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
			|| hasFunctionOnlyBehavior(callee.body, context)
			|| hasScriptFunctionDeclaration(callee.body, context)
			|| (
				callee.type === 'FunctionExpression'
				&& hasFunctionContextReference(callee.body, context)
			)
		) {
			return;
		}

		return getCommentSafeProblem(context, {
			node: expression,
			messageId: MESSAGE_ID,
			fix: getFix(expressionStatement, callee.body, context),
		}, sourceCode.getRange(expressionStatement), [callee.body]);
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
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
