import getLineIndent from './get-line-indent.js';
import reindentText from './reindent-text.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
Get the text of an `if` branch without its block braces, re-indented to the line of the `if` statement.

The result starts with the indentation of the `if` statement, so it can be inserted at the start of a line. An empty block gives an empty string.

@param {ESTree.Statement} branch - The `consequent` or `alternate` of an `IfStatement`.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {string}
*/
export default function getUnwrappedBranchText(branch, context) {
	const {sourceCode} = context;
	const ifIndent = getLineIndent(branch.parent, context);

	if (branch.type !== 'BlockStatement') {
		return `${ifIndent}${sourceCode.getText(branch)}`;
	}

	const openingBrace = sourceCode.getFirstToken(branch);
	const closingBrace = sourceCode.getLastToken(branch);
	const firstBodyToken = sourceCode.getTokenAfter(openingBrace, {includeComments: true});
	const bodyText = sourceCode.text.slice(sourceCode.getRange(openingBrace)[1], sourceCode.getRange(closingBrace)[0]);
	const bodyIndent = firstBodyToken === closingBrace ? '' : getLineIndent(firstBodyToken, context);
	const text = reindentText(bodyText, bodyIndent, ifIndent).trim();
	return text ? `${ifIndent}${text}` : '';
}
