'use strict';
const {
	isParenthesized,
	getParenthesizedRange,
} = require('./utils/parentheses.js');
const {removeParentheses} = require('./fix/index.js');
const shouldAddParenthesesToSpreadElementArgument = require('./utils/should-add-parentheses-to-spread-element-argument.js');

const MESSAGE_ID = 'no-useless-fallback-in-spread';
const messages = {
	[MESSAGE_ID]: 'The empty object is useless.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	ObjectExpression(node) {
		if (!(
			node.properties.length === 0
			&& node.parent.type === 'LogicalExpression'
			&& node.parent.right === node
			&& (node.parent.operator === '||' || node.parent.operator === '??')
			&& node.parent.parent.type === 'SpreadElement'
			&& node.parent.parent.argument === node.parent
			&& node.parent.parent.parent.type === 'ObjectExpression'
			&& node.parent.parent.parent.properties.includes(node.parent.parent)
		)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
				const {sourceCode} = context;
				const logicalExpression = node.parent;
				const {left} = logicalExpression;
				const isLeftObjectParenthesized = isParenthesized(left, sourceCode);
				const [, start] = isLeftObjectParenthesized
					? getParenthesizedRange(left, sourceCode)
					: left.range;
				const [, end] = logicalExpression.range;

				yield fixer.removeRange([start, end]);

				if (
					isLeftObjectParenthesized
					|| !shouldAddParenthesesToSpreadElementArgument(left)
				) {
					yield * removeParentheses(logicalExpression, fixer, sourceCode);
				}
			},
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow useless fallback when spreading in object literals.',
		},
		fixable: 'code',
		messages,
	},
};
