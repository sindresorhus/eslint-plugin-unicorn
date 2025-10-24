import {isColonToken} from '@eslint-community/eslint-utils';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
@typedef {line: number, column: number} Position

Get the location of the given `SwitchCase` node for reporting.

@param {ESTree.SwitchCase} node - The `SwitchCase` node to get.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {{start: Position, end: Position}} The location of the class node for reporting.
*/
export default function getSwitchCaseHeadLocation(node, context) {
	const {sourceCode} = context;
	const startToken = node.test || sourceCode.getFirstToken(node);
	const colonToken = sourceCode.getTokenAfter(startToken, isColonToken);
	return {start: sourceCode.getLoc(node).start, end: sourceCode.getLoc(colonToken).end};
}
