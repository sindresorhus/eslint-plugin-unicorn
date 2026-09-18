/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
Get the indentation of the line a node or token starts on, no matter where on the line it sits.

Unlike `getIndentString()`, which returns the whitespace directly before the node, this returns the leading whitespace of the whole line.

@param {ESTree.Node | ESTree.Token} nodeOrToken - The node or token.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {string}
*/
export default function getLineIndent(nodeOrToken, context) {
	const {sourceCode} = context;
	const {line} = sourceCode.getLoc(nodeOrToken).start;
	return /^[\t ]*/.exec(sourceCode.lines[line - 1])[0];
}
