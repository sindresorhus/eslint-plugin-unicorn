'use strict';

/**
Get location info for given node or range.

@param {import('eslint').SourceCode} sourceCode - The source code object.
@param {import('estree').Node | number[]} nodeOrRange - The AST node or range to get the location for.
@param {int} [startOffset] - Start position offset.
@param {int} [endOffset] - End position offset.
@returns {import('estree').SourceLocation}
*/
function toLocation(sourceCode, nodeOrRange, startOffset = 0, endOffset = 0) {
	const [start, end] = Array.isArray(nodeOrRange) ? nodeOrRange : nodeOrRange.range;

	return {
		start: sourceCode.getLocFromIndex(start + startOffset),
		end: sourceCode.getLocFromIndex(end + endOffset)
	};
}

module.exports = toLocation;
