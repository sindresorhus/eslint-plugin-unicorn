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

/**
Get the statement after a statement. An exported declaration counts as its `export` statement.

A declaration held by another statement, like the one in a `for` head, has no statement after it, so this returns `undefined` for it instead of the statement after the one holding it.

@param {ESTree.Node} node
@param {ESLint.Rule.RuleContext} context
*/
export const getNextStatement = (node, context) => {
	const {parent} = node;
	const statement = parent.type.startsWith('Export') && parent.declaration === node ? parent : node;
	return getNextNode(statement, context);
};
