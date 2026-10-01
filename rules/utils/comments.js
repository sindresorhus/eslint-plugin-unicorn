import getComments from './get-comments.js';
import {isEslintDisableOrEnableDirective} from './eslint-directive.js';

const getRange = (context, nodeOrRange) =>
	Array.isArray(nodeOrRange) ? nodeOrRange : context.sourceCode.getRange(nodeOrRange);

const isRangeInside = ([start, end], [parentStart, parentEnd]) =>
	start >= parentStart && end <= parentEnd;

/**
Check whether replacing or removing a node or range would remove comments that are not preserved by child nodes or ranges.

@param {import('eslint').Rule.RuleContext} context
@param {object | Array<number>} nodeOrRange
@param {Array<object | Array<number>>} preservedNodeOrRanges
@param {object} options
@param {boolean} options.ignoreDirectives
@returns {boolean}
*/
function wouldRemoveComments(context, nodeOrRange, preservedNodeOrRanges = [], {ignoreDirectives = false} = {}) {
	const {sourceCode} = context;
	const replacedRange = getRange(context, nodeOrRange);
	const preservedRanges = preservedNodeOrRanges.map(nodeOrRange => getRange(context, nodeOrRange));

	return getComments(context).some(comment => {
		const commentRange = sourceCode.getRange(comment);
		return isRangeInside(commentRange, replacedRange)
			&& preservedRanges.every(range => !isRangeInside(commentRange, range))
			&& !(ignoreDirectives && isEslintDisableOrEnableDirective(context, comment));
	});
}

/**
Check whether a node or range contains ordinary comments outside the preserved nodes or ranges. Disable and enable directives must not prevent a rule from reporting, so ESLint can suppress the report itself.

@param {import('eslint').Rule.RuleContext} context
@param {object | Array<number>} nodeOrRange
@param {Array<object | Array<number>>} preservedNodeOrRanges
@returns {boolean}
*/
const hasNonDirectiveComment = (context, nodeOrRange, preservedNodeOrRanges = []) =>
	wouldRemoveComments(context, nodeOrRange, preservedNodeOrRanges, {ignoreDirectives: true});

/**
Withhold fixes and suggestions when the affected node or range contains comments. Reports remain available for ESLint's directive suppression.

@param {import('eslint').Rule.RuleContext} context
@param {object} problem
@param {object | Array<number>} nodeOrRange
@param {Array<object | Array<number>>} preservedNodeOrRanges
@returns {object}
*/
function getCommentSafeProblem(context, problem, nodeOrRange = problem.node, preservedNodeOrRanges = []) {
	if (!wouldRemoveComments(context, nodeOrRange, preservedNodeOrRanges)) {
		return problem;
	}

	const problemWithoutFixes = {...problem};
	delete problemWithoutFixes.fix;
	delete problemWithoutFixes.suggest;
	return problemWithoutFixes;
}

/**
Get the last trailing comment that starts on the same line where a node or token ends.

@param {import('eslint').Rule.RuleContext} context
@param {object} nodeOrToken
@param {object} options
@param {boolean} options.ignoreDirectives
@returns {object | undefined}
*/
function getLastTrailingCommentOnSameLine(context, nodeOrToken, {ignoreDirectives = false} = {}) {
	const {sourceCode} = context;
	const nodeOrTokenEndLine = sourceCode.getLoc(nodeOrToken).end.line;

	return sourceCode.getCommentsAfter(nodeOrToken)
		.findLast(comment => sourceCode.getLoc(comment).start.line === nodeOrTokenEndLine
			&& !(ignoreDirectives && isEslintDisableOrEnableDirective(context, comment)));
}

/**
Check whether any comment falls entirely within the given range.

@param {import('eslint').Rule.RuleContext} context
@param {Array<number>} range
@returns {boolean}
*/
const hasCommentInRange = (context, range) => wouldRemoveComments(context, range);

export {
	getLastTrailingCommentOnSameLine,
	getCommentSafeProblem,
	hasCommentInRange,
	hasNonDirectiveComment,
	wouldRemoveComments,
};
