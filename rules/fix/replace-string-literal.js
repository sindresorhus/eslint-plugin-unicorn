'use strict';

function replaceStringLiteral(fixer, node, text, relativeRangeStart = 0, relativeRangeEnd) {
	const firstCharacterIndex = node.range[0] + 1;
	const start = relativeRangeStart + firstCharacterIndex;
	const end = Number.isInteger(relativeRangeEnd) ? relativeRangeEnd + firstCharacterIndex : node.range[1] - 1;

	return fixer.replaceTextRange([start, end], text);
}

module.exports = replaceStringLiteral;
