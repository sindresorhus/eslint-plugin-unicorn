/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
@param {ESTree.Node} node - The class node to get.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {string}.
*/
export default function getIndentString(node, context) {
	const {sourceCode} = context;
	const {start: {line, column}} = sourceCode.getLoc(node);
	const lines = sourceCode.getLines();
	const before = lines[line - 1].slice(0, column);

	return before.match(/\s*$/)[0];
}
