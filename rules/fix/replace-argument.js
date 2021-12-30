'use strict';
const {getParentheses} = require('../utils/parentheses.js');

function replaceArgument(fixer, node, text, sourceCode) {
	const parentheses = getParentheses(node, sourceCode);
	const firstToken = parentheses[0] || node;
	const lastToken = parentheses[parentheses.length - 1] || node;

	const [start] = firstToken.range;
	const [, end] = lastToken.range;

	return fixer.replaceTextRange([start, end], text);
}

module.exports = replaceArgument;
