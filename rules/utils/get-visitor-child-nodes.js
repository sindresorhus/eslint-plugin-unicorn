/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import {SourceCode} from 'eslint';
*/

const propertyKeyNodeTypes = new Set(['Property', 'PropertyDefinition', 'MethodDefinition']);

// Non-computed member properties and property keys are names, not evaluated expressions
const isPropertyNameKey = (node, key) =>
	!node.computed
	&& (
		(node.type === 'MemberExpression' && key === 'property')
		|| (key === 'key' && propertyKeyNodeTypes.has(node.type))
	);

function * iterateChildNodes(node, visitorKeys, shouldSkipPropertyNames) {
	// Parsers provide visitor keys for every node type they produce, the fallback protects against custom parsers that do not.
	/* node:coverage ignore next */
	for (const key of visitorKeys[node.type] ?? []) {
		if (shouldSkipPropertyNames && isPropertyNameKey(node, key)) {
			continue;
		}

		const value = node[key];

		// This runs for every node of many whole-subtree walks, so avoid wrapping single children in an array.
		if (!Array.isArray(value)) {
			if (value?.type) {
				yield value;
			}

			continue;
		}

		for (const child of value) {
			if (child?.type) {
				yield child;
			}
		}
	}
}

/**
Yield the direct child nodes of a node in visitor-key order, skipping `null` and array holes.

@param {ESTree.Node} node
@param {SourceCode['visitorKeys']} visitorKeys
*/
export default function getVisitorChildNodes(node, visitorKeys) {
	return iterateChildNodes(node, visitorKeys, false);
}

/**
Like `getVisitorChildNodes`, but skip children that are names instead of evaluated expressions: non-computed member properties (`foo.bar`) and property keys (`{bar: foo}`, `class {bar = foo}`).

@param {ESTree.Node} node
@param {SourceCode['visitorKeys']} visitorKeys
*/
export function getEvaluatedChildNodes(node, visitorKeys) {
	return iterateChildNodes(node, visitorKeys, true);
}
