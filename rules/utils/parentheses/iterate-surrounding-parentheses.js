// Based on https://github.com/eslint-community/eslint-utils/blob/1da21d4440028679f3c8d5841b85f9d97ca7f0f7/src/is-parenthesized.mjs#L1

import {
	isOpeningParenToken as isOpeningParenthesisToken,
	isClosingParenToken as isClosingParenthesisToken,
} from '@eslint-community/eslint-utils';
import getParentSyntaxOpeningParenthesis from './get-parent-syntax-opening-parenthesis.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
@import {
	OpeningParenToken as OpeningParenthesisToken,
	ClosingParenToken as ClosingParenthesisToken,
} from '@eslint-community/eslint-utils';
*/

/**
Get surrounding parenthesis of the tokens or nodes.

@param {[ESTree.Node | OpeningParenthesisToken, ESTree.Node | ClosingParenthesisToken]} param0
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns [[OpeningParenthesisToken, ClosingParenthesisToken] | void]
*/
function getSurroundingParentheses([head, tail], context) {
	const before = context.sourceCode.getTokenBefore(head);

	if (!isOpeningParenthesisToken(before)) {
		return;
	}

	const after = context.sourceCode.getTokenAfter(tail);

	if (!isClosingParenthesisToken(after)) {
		return;
	}

	return [before, after];
}

const SYNTAX_OPENING_PARENTHESIS_INITIAL_VALUE = Symbol('SYNTAX_OPENING_PARENTHESIS_INITIAL_VALUE');

/**
Iterate surrounding parenthesis of the node.

@param {ESTree.Node} node
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@yields [[OpeningParenthesisToken, ClosingParenthesisToken]]
*/
function * iterateSurroundingParentheses(node, context) {
	if (
		!node
		// `Program` can't be parenthesized
		|| !node.parent
		// `CatchClause.param` can't be parenthesized, example `try {} catch (error) {}`
		|| (node.parent.type === 'CatchClause' && node.parent.param === node)
	) {
		return;
	}

	let syntaxOpeningParenthesis = SYNTAX_OPENING_PARENTHESIS_INITIAL_VALUE;
	let parentheses = [node, node];
	while ((parentheses = getSurroundingParentheses(parentheses, context))) {
		const [openingParenthesisToken] = parentheses;

		if (syntaxOpeningParenthesis === SYNTAX_OPENING_PARENTHESIS_INITIAL_VALUE) {
			syntaxOpeningParenthesis = getParentSyntaxOpeningParenthesis(node, context);
		}

		if (openingParenthesisToken === syntaxOpeningParenthesis) {
			break;
		}

		yield parentheses;
	}
}

export default iterateSurroundingParentheses;
