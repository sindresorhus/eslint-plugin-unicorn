'use strict';
const {isParenthesized, isOpeningParenToken, isClosingParenToken} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const replaceNodeOrTokenAndSpacesBefore = require('./utils/replace-node-or-token-and-spaces-before');

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

const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[selector]: node => context.report({
			node,
			messageId: MESSAGE_ID,
			* fix(fixer) {
				const {left, right} = node;

				let leftStartNodeOrToken = left;
				let leftEndNodeOrToken = left;
				if (isParenthesized(left, sourceCode)) {
					leftStartNodeOrToken = sourceCode.getTokenBefore(left, isOpeningParenToken);
					leftEndNodeOrToken = sourceCode.getTokenAfter(left, isClosingParenToken);
				}

				yield fixer.insertTextBefore(leftStartNodeOrToken, 'Array.isArray(');
				yield fixer.insertTextAfter(leftEndNodeOrToken, ')');

				const instanceofToken = sourceCode.getTokenAfter(left, isInstanceofToken);
				yield * replaceNodeOrTokenAndSpacesBefore(instanceofToken, '', fixer, sourceCode);
				yield * replaceNodeOrTokenAndSpacesBefore(right, '', fixer, sourceCode);
			}
		})
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
