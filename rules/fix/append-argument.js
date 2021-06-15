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
	if (node.arguments.length > 0) {
		text = isCommaToken(penultimateToken) ? ` ${text},` : `, ${text}`;
	}

	return fixer.insertTextBefore(lastToken, text);
}

module.exports = appendArgument;
