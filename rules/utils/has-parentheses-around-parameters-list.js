'use strict';
const {isOpeningParenToken} = require('eslint-utils');

/**
Check if function has parentheses around parameters list.

@param {Node} node - The AST node to check.
@param {SourceCode} sourceCode - The source code object.
@returns {boolean}
*/
function hasParenthesesAroundParametersList({type, params, range}, sourceCode) {
	if (
		type !== 'ArrowFunctionExpression' ||
		params.length !== 1
	) {
		return true;
	}

	const [onlyArgument] = params;
	const tokenBefore = sourceCode.getTokenBefore(onlyArgument);
	return tokenBefore &&
		// `(` maybe not belong to function, example `array.map(x => x)`
		tokenBefore.range[0] >= range[0] &&
		isOpeningParenToken(tokenBefore);
}

module.exports = hasParenthesesAroundParametersList;
