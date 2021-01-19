'use strict';
const isNewExpressionWithParentheses = require('./is-new-expression-with-parentheses');

function * switchNewExpressionToCallExpression(node, sourceCode, fixer) {
	const [start] = node.range;
	let end = start + 3; // `3` = length of `new`
	const textAfter = sourceCode.text.slice(end);
	const [leadingSpaces] = textAfter.match(/^\s*/);
	end += leadingSpaces.length;
	yield fixer.removeRange([start, end]);

	if (!isNewExpressionWithParentheses(node, sourceCode)) {
		yield fixer.insertTextAfter(node, '()');
	}
}

module.exports = switchNewExpressionToCallExpression;
