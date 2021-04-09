'use strict';
const {getParentheses} = require('./parentheses');

function * replaceNodeOrTokenAndSpacesBefore(nodeOrToken, replacement, fixer, sourceCode) {
	const tokens = getParentheses(nodeOrToken, sourceCode);

	for (const token of tokens) {
		yield * replaceNodeOrTokenAndSpacesBefore(token, '', fixer, sourceCode);
	}

	let [start, end] = nodeOrToken.range;

	const textBefore = sourceCode.text.slice(0, start);
	const [trailingSpaces] = textBefore.match(/\s*$/);
	const [lineBreak] = trailingSpaces.match(/(?:\r?\n|\r){0,1}/);
	start -= trailingSpaces.length;

	yield fixer.replaceTextRange([start, end], `${lineBreak}${replacement}`);
}

module.exports = replaceNodeOrTokenAndSpacesBefore;
