import getComments from './get-comments.js';

const getRange = (context, nodeOrRange) =>
	Array.isArray(nodeOrRange) ? nodeOrRange : context.sourceCode.getRange(nodeOrRange);

const isRangeInside = ([start, end], [parentStart, parentEnd]) =>
	start >= parentStart && end <= parentEnd;

/**
Check whether a node or source range contains comments.

@param {import('eslint').Rule.RuleContext} context
@param {object | Array<number>} nodeOrRange
@returns {boolean}
*/
function hasCommentsInside(context, nodeOrRange) {
	const {sourceCode} = context;
	const range = getRange(context, nodeOrRange);
	return getComments(context).some(comment => isRangeInside(sourceCode.getRange(comment), range));
}

/**
Check whether replacing or removing a node or range would remove comments that are not preserved by child nodes or ranges.

@param {import('eslint').Rule.RuleContext} context
@param {object | Array<number>} nodeOrRange
@param {Array<object | Array<number>>} preservedNodeOrRanges
@returns {boolean}
*/
function wouldRemoveComments(context, nodeOrRange, preservedNodeOrRanges = []) {
	const {sourceCode} = context;
	const replacedRange = getRange(context, nodeOrRange);
	const preservedRanges = preservedNodeOrRanges.map(nodeOrRange => getRange(context, nodeOrRange));

	return getComments(context).some(comment => {
		const commentRange = sourceCode.getRange(comment);
		return isRangeInside(commentRange, replacedRange)
			&& !preservedRanges.some(range => isRangeInside(commentRange, range));
	});
}

export {
	hasCommentsInside,
	wouldRemoveComments,
};
