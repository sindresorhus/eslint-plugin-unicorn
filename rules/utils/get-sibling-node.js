/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
@param {ESTree.Node} node
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
@param {1 | -1} offset
*/
function getSiblingNode(node, context, offset) {
	const {parent} = node;
	const visitorKeys = context.sourceCode.visitorKeys[parent.type] || Object.keys(parent);

	for (const property of visitorKeys) {
		const value = parent[property];

		if (value !== node && Array.isArray(value)) {
			const index = value.indexOf(node);

			if (index !== -1) {
				return value[index + offset];
			}
		}
	}
}

/**
@param {ESTree.Node} node
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
*/
export const getPreviousNode = (node, context) => getSiblingNode(node, context, -1);

/**
@param {ESTree.Node} node
@param {ESLint.Rule.RuleContext} context - The ESLint rule context object.
*/
export const getNextNode = (node, context) => getSiblingNode(node, context, 1);
