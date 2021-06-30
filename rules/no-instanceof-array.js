'use strict';
const replaceNodeOrTokenAndSpacesBefore = require('./utils/replace-node-or-token-and-spaces-before.js');
const {getParenthesizedRange} = require('./utils/parentheses.js');

const isInstanceofToken = token => token.value === 'instanceof' && token.type === 'Keyword';

const MESSAGE_ID = 'no-instanceof-array';
const messages = {
	[MESSAGE_ID]: 'Use `Array.isArray()` instead of `instanceof Array`.'
};
const selector = [
	'BinaryExpression',
	'[operator="instanceof"]',
	'[right.type="Identifier"]',
	'[right.name="Array"]'
].join('');

const create = context => ({
	[selector]: node => ({
		node,
		messageId: MESSAGE_ID,
		/** @param {import('eslint').Rule.RuleFixer} fixer */
		* fix(fixer) {
			const {left, right} = node;
			const sourceCode = context.getSourceCode();

			const range = getParenthesizedRange(left, sourceCode);
			yield fixer.insertTextBeforeRange(range, 'Array.isArray(');
			yield fixer.insertTextAfterRange(range, ')');

			const instanceofToken = sourceCode.getTokenAfter(left, isInstanceofToken);
			yield * replaceNodeOrTokenAndSpacesBefore(instanceofToken, '', fixer, sourceCode);
			yield * replaceNodeOrTokenAndSpacesBefore(right, '', fixer, sourceCode);
		}
	})
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require `Array.isArray()` instead of `instanceof Array`.'
		},
		fixable: 'code',
		messages
	}
};
