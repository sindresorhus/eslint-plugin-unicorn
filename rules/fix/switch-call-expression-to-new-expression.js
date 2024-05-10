'use strict';
const {isParenthesized} = require('../utils/parentheses.js');
const shouldAddParenthesesToNewExpressionCallee = require('../utils/should-add-parentheses-to-new-expression-callee.js');
const fixSpaceAroundKeyword = require('./fix-space-around-keywords.js');

function * switchCallExpressionToNewExpression(node, sourceCode, fixer) {
	yield * fixSpaceAroundKeyword(fixer, node, sourceCode);
	yield fixer.insertTextBefore(node, 'new ');

	const {callee} = node;
	if (
		!isParenthesized(callee, sourceCode)
		&& shouldAddParenthesesToNewExpressionCallee(callee)
	) {
		yield fixer.insertTextBefore(callee, '(');
		yield fixer.insertTextAfter(callee, ')');
	}
}

module.exports = switchCallExpressionToNewExpression;
