'use strict';
const {matches} = require('./selectors/index.js');
const {
	isParenthesized,
	getParenthesizedRange,
	getParentheses,
} = require('./utils/parentheses.js');
const shouldAddParenthesesToSpreadElementArgument = require('./utils/should-add-parentheses-to-spread-element-argument.js');

const MESSAGE_ID = 'no-useless-fallback-in-spread';
const messages = {
	[MESSAGE_ID]: 'The empty object is useless.',
};

const selector = [
	'ObjectExpression',
	' > ',
	'SpreadElement.properties',
	' > ',
	'LogicalExpression.argument',
	matches([
		'[operator="||"]',
		'[operator="??"]',
	]),
	' > ',
	'ObjectExpression[properties.length=0].right',
].join('');

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	[selector](emptyObject) {
		return {
			node: emptyObject,
			messageId: MESSAGE_ID,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
				const sourceCode = context.getSourceCode();
				const logicalExpression = emptyObject.parent;
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
					const parentheses = getParentheses(logicalExpression, sourceCode);

					for (const token of parentheses) {
						yield fixer.remove(token);
					}
				}
			},
		};
	},
});

const schema = [];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Forbid useless fallback when spreading in object literals.',
		},
		fixable: 'code',
		schema,
		messages,
	},
};
