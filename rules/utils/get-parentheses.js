'use strict';
const {isOpeningParenToken, isClosingParenToken} = require('eslint-utils');
const getParenthesizedTimes = require('./get-parenthesized-times');

/*
Get the first opening parenthesis token and the last closing parenthesis token of a parenthesized node.

@param {Node} node - The node to be checked.
@param {SourceCode} sourceCode - The source code object.
@returns {Token[]}
*/
function getParentheses(node, sourceCode) {
	const parenthesizedTimes = getParenthesizedTimes(node, sourceCode);

	if (parenthesizedTimes > 0) {
		return [
			sourceCode.getTokenBefore(node, {skip: parenthesizedTimes - 1, filter: isOpeningParenToken}),
			sourceCode.getTokenAfter(node, {skip: parenthesizedTimes - 1, filter: isClosingParenToken})
		];
	}

	return [];
}

module.exports = getParentheses;
