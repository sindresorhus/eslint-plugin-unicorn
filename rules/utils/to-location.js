/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
Get location info for the given node or range.

@param {ESTree.Node | ESTree.Range} nodeOrRange - The AST node or range to get the location for.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@param {int} [startOffset] - Start position offset.
@param {int} [endOffset] - End position offset.
@returns {ESTree.SourceLocation}
*/
function toLocation(nodeOrRange, context, startOffset = 0, endOffset = 0) {
	const {sourceCode} = context;
	const [start, end] = Array.isArray(nodeOrRange) ? nodeOrRange : sourceCode.getRange(nodeOrRange);

	return {
		start: sourceCode.getLocFromIndex(start + startOffset),
		end: sourceCode.getLocFromIndex(end + endOffset),
	};
}

export default toLocation;
