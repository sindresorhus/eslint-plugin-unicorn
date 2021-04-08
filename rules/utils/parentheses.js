'use strict';
const {isParenthesized, isOpeningParenToken, isClosingParenToken} = require('eslint-utils');

/*
Get how many times node is parenthesized.

@param {Node} node - The node to be checked.
@param {SourceCode} sourceCode - The source code object.
@returns {number}
*/
function getParenthesizedTimes(node, sourceCode) {
	let times = 0;
	while (isParenthesized(times + 1, node, sourceCode)) {
		times++;
	}

	return times;
}

/*
Get all parentheses token around node.

@param {Node} node - The node to be checked.
@param {SourceCode} sourceCode - The source code object.
@returns {Token[]}
*/
function getParentheses(node, sourceCode) {
	const count = getParenthesizedTimes(node, sourceCode);

	if (count === 0) {
		return [];
	}

	return [
		...sourceCode.getTokensBefore(node, {count, filter: isOpeningParenToken}),
		...sourceCode.getTokensAfter(node, {count, filter: isClosingParenToken})
	];
}

/*
Get parenthesized range of node.

@param {Node} node - The node to be checked.
@param {SourceCode} sourceCode - The source code object.
@returns {number[]}
*/
function getParenthesizedRange(node, sourceCode) {
	const parentheses = getParentheses(node, sourceCode);
	const [start] = (parentheses[0] || node).range;
	const [, end] = (parentheses[parentheses.length - 1] || node).range;
	return [start, end];
}

module.exports = {
	getParenthesizedTimes,
	getParentheses,
	getParenthesizedRange
};
