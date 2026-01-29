import iterateSurroundingParentheses from './iterate-surrounding-parentheses.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
@import {
	OpeningParenToken as OpeningParenthesisToken,
	ClosingParenToken as ClosingParenthesisToken,
} from '@eslint-community/eslint-utils';
*/

/** @typedef {WeakMap<ESTree.Node, (OpeningParenthesisToken | ClosingParenthesisToken)[]>} */
const parenthesesCache = new WeakMap();

/**
Get surrounding parenthesis of the node.

@param {ESTree.Node} node
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns [(OpeningParenthesisToken | ClosingParenthesisToken)[]]
*/
export function getParentheses(node, context) {
	if (!node || !parenthesesCache.has(node)) {
		const parenthesis = [];
		for (const [openingParenthesisToken, closingParenthesisToken] of iterateSurroundingParentheses(node, context)) {
			parenthesis.unshift(openingParenthesisToken);
			parenthesis.push(closingParenthesisToken);
		}

		parenthesesCache.set(node, parenthesis);
	}

	return parenthesesCache.get(node);
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

/**
Check whether a given node is parenthesized or not.

@param {ESTree.Node} node The AST node to check.
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@returns {boolean} `true` if the node is parenthesized.
*/
export function isParenthesized(node, context) {
	if (parenthesesCache.has(node)) {
		return parenthesesCache.get(node).length > 0;
	}

	const isNotParenthesized = iterateSurroundingParentheses(node, context).next().done;

	if (isNotParenthesized) {
		parenthesesCache.set(node, []);
	}

	return !isNotParenthesized;
}
