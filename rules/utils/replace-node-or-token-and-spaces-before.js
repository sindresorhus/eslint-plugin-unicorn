"use strict";
const {isOpeningParenToken, isClosingParenToken} = require('eslint-utils');
const getParenthesizedTimes = require('./get-parenthesized-times');

function * replaceNodeOrTokenAndSpacesAround(nodeOrToken, replacement, fixer, sourceCode) {
	const parenthesizedTimes = getParenthesizedTimes(nodeOrToken, sourceCode);

	if (parenthesizedTimes > 0) {
		let lastBefore = nodeOrToken;
		let lastAfter = nodeOrToken;
		for (let i = 0; i < parenthesizedTimes; i++) {
			const openingParenthesisToken = sourceCode.getTokensBefore(lastBefore, isOpeningParenToken);
			const closingParenthesisToken = sourceCode.getTokensAfter(lastAfter, isClosingParenToken);
			yield * replaceNodeOrTokenAndSpacesAround(openingParenthesisToken, '', fixer, sourceCode);
			yield * replaceNodeOrTokenAndSpacesAround(closingParenthesisToken, '', fixer, sourceCode);
			lastBefore = openingParenthesisToken;
			lastAfter = closingParenthesisToken;
		}
	}

	let [start, end] = nodeOrToken.range;

	const textBefore = sourceCode.text.slice(0, start);
	const [trailingSpaces] = textBefore.match(/\s*$/);
	const [leadingLineBreak] = trailingSpaces.match(/(?:\r?\n|\r)*/);
	start -= trailingSpaces.length;

	// const textAfter = sourceCode.text.slice(0, end);
	// const [leadingSpaces] = textBefore.match(/^\s*/);
	// const [trailingLineBreak] = leadingSpaces.match(/(?:\r?\n|\r)*/);
	// end += trailingSpaces.length;

	yield fixer.replaceTextRange([start, end], `${leadingLineBreak}${replacement}`);
}

module.exports = replaceNodeOrTokenAndSpacesAround;
