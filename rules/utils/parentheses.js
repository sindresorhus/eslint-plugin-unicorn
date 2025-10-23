import {isParenthesized, isOpeningParenToken, isClosingParenToken} from '@eslint-community/eslint-utils';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/*
Get how many times the node is parenthesized.

@param {ESTree.Node} node - The node to be checked.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {number}
*/
function getParenthesizedTimes(node, context) {
	let times = 0;

	while (isParenthesized(times + 1, node, context.sourceCode)) {
		times++;
	}

	return times;
}

/*
Get all parentheses tokens around the node.

@param {ESTree.Node} node - The node to be checked.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {Token[]}
*/
export function getParentheses(node, context) {
	const count = getParenthesizedTimes(node, context);

	if (count === 0) {
		return [];
	}

	return [
		...context.sourceCode.getTokensBefore(node, {count, filter: isOpeningParenToken}),
		...context.sourceCode.getTokensAfter(node, {count, filter: isClosingParenToken}),
	];
}

/*
Get the parenthesized range of the node.

@param {ESTree.Node} node - The node to be checked.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {number[]}
*/
export function getParenthesizedRange(node, context) {
	const parentheses = getParentheses(node, context);
	const [start] = context.sourceCode.getRange(parentheses[0] ?? node);
	const [, end] = context.sourceCode.getRange(parentheses.at(-1) ?? node);
	return [start, end];
}

/*
Get the parenthesized text of the node.

@param {ESTree.Node} node - The node to be checked.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {string}
*/
export function getParenthesizedText(node, context) {
	const [start, end] = getParenthesizedRange(node, context);
	return context.sourceCode.text.slice(start, end);
}

export {isParenthesized} from '@eslint-community/eslint-utils';
