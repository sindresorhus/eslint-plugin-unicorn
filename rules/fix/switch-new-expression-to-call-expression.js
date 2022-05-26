'use strict';
const isNewExpressionWithParentheses = require('../utils/is-new-expression-with-parentheses.js');
const {isParenthesized} = require('../utils/parentheses.js');

function * fixReturnOrThrowStatementArgument(newExpression, sourceCode, fixer) {
	const {parent} = newExpression;
	if (
		(parent.type !== 'ReturnStatement' && parent.type !== 'ThrowStatement')
		|| parent.argument !== newExpression
		|| isParenthesized(newExpression, sourceCode)
	) {
		return;
	}

	const returnStatement = parent;
	const returnToken = sourceCode.getFirstToken(returnStatement);
	const classNode = newExpression.callee;

	// Ideally, we should use first parenthesis of the `callee`, and should check spaces after the `new` token
	// But adding extra parentheses is harmless, no need to be too complicated
	if (returnToken.loc.start.line === classNode.loc.start.line) {
		return;
	}

	yield fixer.insertTextAfter(returnToken, ' (');
	yield fixer.insertTextAfter(newExpression, ')');
}

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
	yield * fixReturnOrThrowStatementArgument(node, sourceCode, fixer);
}

module.exports = switchNewExpressionToCallExpression;
