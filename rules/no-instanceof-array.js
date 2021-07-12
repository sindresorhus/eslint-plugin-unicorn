'use strict';
const {getParenthesizedRange} = require('./utils/parentheses.js');
const {replaceNodeOrTokenAndSpacesBefore} = require('./fix/index.js');

const isInstanceofToken = token => token.value === 'instanceof' && token.type === 'Keyword';

const MESSAGE_ID = 'no-instanceof-array';
const messages = {
	[MESSAGE_ID]: 'Use `Array.isArray()` instead of `instanceof Array`.',
};
const selector = [
	'BinaryExpression',
	'[operator="instanceof"]',
	'[right.type="Identifier"]',
	'[right.name="Array"]',
].join('');

const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[selector](node) {
			const {left, right} = node;
			const instanceofToken = sourceCode.getTokenAfter(left, isInstanceofToken);

			return {
				node: instanceofToken,
				messageId: MESSAGE_ID,
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				* fix(fixer) {
					const range = getParenthesizedRange(left, sourceCode);
					yield fixer.insertTextBeforeRange(range, 'Array.isArray(');
					yield fixer.insertTextAfterRange(range, ')');

					yield * replaceNodeOrTokenAndSpacesBefore(instanceofToken, '', fixer, sourceCode);
					yield * replaceNodeOrTokenAndSpacesBefore(right, '', fixer, sourceCode);
				},
			};
		},
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require `Array.isArray()` instead of `instanceof Array`.',
		},
		fixable: 'code',
		messages,
	},
};
