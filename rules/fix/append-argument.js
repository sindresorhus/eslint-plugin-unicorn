'use strict';
const {isCommaToken} = require('eslint-utils');

function appendArgument(fixer, node, text, sourceCode) {
	// Parentheses of `NewExpression` could be omitted,
	// which means appendArgument should not be called when node.arguments.length is 0
	/* c8 ignore next 3 */
	if (node.type === 'NewExpression' && node.arguments.length === 0) {
		throw new Error(`Unexpected node "${node.type}".`);
	}

	const [penultimateToken, lastToken] = sourceCode.getLastTokens(node, 2);
	if (node.arguments.length > 0) {
		text = isCommaToken(penultimateToken) ? ` ${text},` : `, ${text}`;
	}

	return fixer.insertTextBefore(lastToken, text);
}

module.exports = appendArgument;
