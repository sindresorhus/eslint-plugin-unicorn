import {isCommaToken} from '@eslint-community/eslint-utils';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
@param {ESLint.Rule.RuleFixer} fixer
@param {ESTree.CallExpression} node
@param {string} text
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {ESLint.Rule.ReportFixer}
*/
export default function appendArgument(fixer, node, text, context) {
	// This function should also work for `NewExpression`
	// But parentheses of `NewExpression` could be omitted, add this check to prevent accident use on it
	/* c8 ignore next 3 */
	if (node.type !== 'CallExpression') {
		throw new Error(`Unexpected node "${node.type}".`);
	}

	const {sourceCode} = context;
	const [penultimateToken, lastToken] = sourceCode.getLastTokens(node, 2);
	if (node.arguments.length > 0) {
		text = isCommaToken(penultimateToken) ? ` ${text},` : `, ${text}`;
	}

	return fixer.insertTextBefore(lastToken, text);
}
