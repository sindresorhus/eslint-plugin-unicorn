/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
*/

/**
Yield the direct child nodes of a node, skipping the `parent` back reference.

@param {ESTree.Node} node
*/
export default function * getChildNodes(node) {
	for (const [key, value] of Object.entries(node)) {
		if (key === 'parent') {
			continue;
		}

		for (const child of Array.isArray(value) ? value : [value]) {
			if (child?.type) {
				yield child;
			}
		}
	}
}
