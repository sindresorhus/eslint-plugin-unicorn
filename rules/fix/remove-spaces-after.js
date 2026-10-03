/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
@param {ESTree.Node | ESTree.Token} nodeOrToken
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@param {ESLint.Rule.RuleFixer} fixer
@returns {ESLint.Rule.ReportFixer}
*/

export default function removeSpacesAfter(nodeOrToken, context, fixer) {
	const [, index] = context.sourceCode.getRange(nodeOrToken);
	const textAfter = context.sourceCode.text.slice(index);
	const [leadingSpaces] = textAfter.match(/^\s*/);
	return fixer.removeRange([index, index + leadingSpaces.length]);
}
