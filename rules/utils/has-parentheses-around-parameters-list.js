'use strict';
const {isOpeningParenToken} = require('eslint-utils');

/**
Check if a function has parentheses around its parameter list.

@param {Node} node - The AST node to check.
@param {SourceCode} sourceCode - The source code object.
@returns {boolean}
*/
function hasParenthesesAroundParametersList(node, sourceCode) {
	if (
		node.type !== 'ArrowFunctionExpression' ||
		node.params.length !== 1
	) {
		return true;
	}

	const [onlyArgument] = node.params;
	const tokenBefore = sourceCode.getTokenBefore(onlyArgument);
	return tokenBefore &&
		// `(` may not belong to the function. For example: `array.map(x => x)`
		tokenBefore.range[0] >= node.range[0] &&
		isOpeningParenToken(tokenBefore);
}

module.exports = hasParenthesesAroundParametersList;
