/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
@param {ESTree.Node | ESTree.Token | number} indexOrNodeOrToken
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@param {ESLint.Rule.RuleFixer} fixer
@returns {ESLint.Rule.ReportFixer}
*/

export default function removeSpacesAfter(indexOrNodeOrToken, context, fixer) {
	let index = indexOrNodeOrToken;
	if (typeof indexOrNodeOrToken === 'object') {
		index = context.sourceCode.getRange(indexOrNodeOrToken)[1];
	}

	const textAfter = context.sourceCode.text.slice(index);
	const [leadingSpaces] = textAfter.match(/^\s*/);
	return fixer.removeRange([index, index + leadingSpaces.length]);
}
