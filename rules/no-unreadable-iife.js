import {
	isParenthesized,
	getParenthesizedRange,
	toLocation,
	wouldRemoveComments,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-unreadable-iife';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'IIFE with parenthesized arrow function body is considered unreadable.',
	[MESSAGE_ID_SUGGESTION]: 'Use a block statement body.',
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', callExpression => {
		if (
			callExpression.callee.type !== 'ArrowFunctionExpression'
			|| callExpression.callee.body.type === 'BlockStatement'
			|| !isParenthesized(callExpression.callee.body, context)
		) {
			return;
		}

		const {body} = callExpression.callee;
		const bodyRange = getParenthesizedRange(body, context);
		const problem = {
			node: callExpression,
			loc: toLocation(bodyRange, context),
			messageId: MESSAGE_ID_ERROR,
		};

		// Comments inside the parentheses but outside the body would be removed
		if (!wouldRemoveComments(context, bodyRange, [body])) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: fixer => fixer.replaceTextRange(
						bodyRange,
						`{ return ${context.sourceCode.getText(body)}; }`,
					),
				},
			];
		}

		return problem;
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unreadable IIFEs.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
