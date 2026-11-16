import {getParentheses} from '../utils/index.js';
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
	const linebreak = trailingSpaces.match(/\r\n|[\n\r\u{2028}\u{2029}]/u);
	start -= trailingSpaces.length;

	// Keep the first line break and any whitespace before it, including spaces at the end of a line comment.
	if (linebreak) {
		start += linebreak.index + linebreak[0].length;
	}

	yield fixer.replaceTextRange([start, end], replacement);
}
