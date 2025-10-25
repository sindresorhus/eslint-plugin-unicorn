import {getParentheses} from '../utils/parentheses.js';
/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
@param {ESTree.Node | ESTree.Token} nodeOrToken
@param {string} replacement
@param {ESLint.Rule.RuleFixer} fixer
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@param {ESLint.SourceCode} [tokenStore]
@returns {ESLint.Rule.ReportFixer}
*/
export default function * replaceNodeOrTokenAndSpacesBefore(nodeOrToken, replacement, fixer, context, tokenStore) {
	const tokens = getParentheses(nodeOrToken, tokenStore ? {sourceCode: tokenStore} : context);

	for (const token of tokens) {
		yield replaceNodeOrTokenAndSpacesBefore(token, '', fixer, context, tokenStore);
	}

	const {sourceCode} = context;
	let [start, end] = sourceCode.getRange(nodeOrToken);

	const textBefore = sourceCode.text.slice(0, start);
	const [trailingSpaces] = textBefore.match(/\s*$/);
	const [lineBreak] = trailingSpaces.match(/(?:\r?\n|\r){0,1}/);
	start -= trailingSpaces.length;

	yield fixer.replaceTextRange([start, end], `${lineBreak}${replacement}`);
}
