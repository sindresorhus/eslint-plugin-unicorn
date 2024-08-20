'use strict';

/**
Find the index of the question mark in a ConditionalExpression node

@param {import('estree').ConditionalExpression} node
@param {import('eslint').SourceCode} sourceCode
@returns {number}
*/
function findIndexOfQuestionMarkInConditionalExpression(node, sourceCode) {
	const testAfterComments = sourceCode.getCommentsAfter(node.test);
	const consequentBeforeComments = sourceCode.getCommentsBefore(node.consequent);

	let start = node.test.range[1];
	let end = node.consequent.range[0];

	if (testAfterComments.length > 0) {
		const lastComment = testAfterComments.at(-1);

		start = lastComment.range[1];
	}

	if (consequentBeforeComments.length > 0) {
		const firstComment = consequentBeforeComments.at(0);

		end = firstComment.range[0];
	}

	return start + sourceCode.getText().slice(start, end).indexOf('?');
}

module.exports = {
	findIndexOfQuestionMarkInConditionalExpression,
};
