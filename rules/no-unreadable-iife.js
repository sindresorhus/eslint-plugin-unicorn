import {isParenthesized, getParenthesizedRange, toLocation} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-unreadable-iife';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'IIFE with parenthesized arrow function body is considered unreadable.',
	[MESSAGE_ID_SUGGESTION]: 'Use a block statement body.',
};

function hasCommentsAroundBodyInParentheses(node, context) {
	const {sourceCode} = context;
	const [start, end] = getParenthesizedRange(node, context);
	const [bodyStart, bodyEnd] = sourceCode.getRange(node);

	return sourceCode.getCommentsInside(node.parent).some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return commentStart >= start
			&& commentEnd <= end
			&& (commentStart < bodyStart || commentEnd > bodyEnd);
	});
}

/** @param {import('eslint').Rule.RuleContext} context */
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
		const problem = {
			node: callExpression,
			loc: toLocation(getParenthesizedRange(body, context), context),
			messageId: MESSAGE_ID_ERROR,
		};

		if (!hasCommentsAroundBodyInParentheses(body, context)) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: fixer => fixer.replaceTextRange(
						getParenthesizedRange(body, context),
						`{ return ${context.sourceCode.getText(body)}; }`,
					),
				},
			];
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
