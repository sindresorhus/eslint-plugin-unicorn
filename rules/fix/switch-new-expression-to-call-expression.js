'use strict';
const isNewExpressionWithParentheses = require('../utils/is-new-expression-with-parentheses.js');
const {isParenthesized} = require('../utils/parentheses.js');
const addParenthesizesToReturnOrThrowExpression = require('./add-parenthesizes-to-return-or-throw-expression.js');

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

	/*
		Remove `new` from this code will makes the function return `undefined`

		```js
			() => {
				return new // comment
					Foo()
			}
		```
	*/
	if (!isParenthesized(node, sourceCode)) {
		// Ideally, we should use first parenthesis of the `callee`, and should check spaces after the `new` token
		// But adding extra parentheses is harmless, no need to be too complicated
		yield * addParenthesizesToReturnOrThrowExpression(fixer, node.parent, node, sourceCode);
	}
}

module.exports = switchNewExpressionToCallExpression;
