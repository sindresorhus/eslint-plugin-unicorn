'use strict';
const {isOpeningParenToken} = require('eslint-utils');

/**
Check if function has parentheses around parameters list.

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
		// `(` maybe not belong to function, example `array.map(x => x)`
		tokenBefore.range[0] >= node.range[0] &&
		isOpeningParenToken(tokenBefore);
}

module.exports = hasParenthesesAroundParametersList;
