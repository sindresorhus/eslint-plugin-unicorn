'use strict';
const {isCommaToken} = require('eslint-utils');

function appendArgument(fixer, node, text, sourceCode) {
	// This function should also work for `NewExpression`
	// But parentheses of `NewExpression` could be omitted, add this check to prevent accident use on it
	/* istanbul ignore next */
	if (node.type !== 'CallExpression') {
		throw new Error(`Unexpected node "${node.type}".`);
	}

	const [penultimateToken, lastToken] = sourceCode.getLastTokens(node, 2);
	const hasArgument = node.arguments.length > 0;
	const hasTrailingComma = hasArgument && isCommaToken(penultimateToken);
	if (hasArgument && !hasTrailingComma) {
		text = `, ${text}`;
	}

	if (hasTrailingComma) {
		text = `${text},`;
	}

	return fixer.insertTextBefore(lastToken, text);
}

module.exports = appendArgument;
