/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
Get the location of the given class node for reporting.

@param {ESTree.ClassDeclaration | ESTree.ClassExpression} node - The class node to get.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {ESTree.SourceLocation} The location of the class node for reporting.
*/
export default function getClassHeadLocation(node, context) {
	const {sourceCode} = context;
	const {body} = node;
	const tokenBeforeBody = sourceCode.getTokenBefore(body);

	const {start} = sourceCode.getLoc(node);
	const {end} = sourceCode.getLoc(tokenBeforeBody);

	return {start, end};
}
