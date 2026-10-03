/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import {SourceCode} from 'eslint';
*/

/**
Yield the direct child nodes of a node in visitor-key order, skipping `null` and array holes.

@param {ESTree.Node} node
@param {SourceCode['visitorKeys']} visitorKeys
*/
export default function * getVisitorChildNodes(node, visitorKeys) {
	// Parsers provide visitor keys for every node type they produce, the fallback protects against custom parsers that do not.
	/* node:coverage ignore next */
	for (const key of visitorKeys[node.type] ?? []) {
		const value = node[key];

		for (const child of Array.isArray(value) ? value : [value]) {
			if (child?.type) {
				yield child;
			}
		}
	}
}
