import getVisitorChildNodes from './get-visitor-child-nodes.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

/**
Check whether a node or any node inside it matches the predicate.

@param {ESTree.Node} node - The node to search, including itself.
@param {ESLint.Rule.RuleContext} context
@param {(node: ESTree.Node) => boolean} predicate
@param {(node: ESTree.Node) => boolean} [shouldSkip] - Do not search inside nodes that match this, for example nested functions. The skipped node itself is still checked with `predicate`.
@returns {boolean}

@example
```
// Find a `return` statement that is not inside a nested function
containsNode(body, context, node => node.type === 'ReturnStatement', isFunction);
```
*/
export default function containsNode(node, context, predicate, shouldSkip) {
	if (predicate(node)) {
		return true;
	}

	if (shouldSkip?.(node)) {
		return false;
	}

	return getVisitorChildNodes(node, context.sourceCode.visitorKeys).some(childNode => containsNode(childNode, context, predicate, shouldSkip));
}
