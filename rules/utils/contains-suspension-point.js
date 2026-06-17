import {isFunction} from '../ast/index.js';

/**
Check whether `node` or any of its descendants, excluding nested functions, is a suspension point (`await`, `for await…of`, or `yield`).

Nested functions are not descended into, since their suspension points belong to a different function.

@param {import('estree').Node} node
@param {import('eslint').SourceCode['visitorKeys']} visitorKeys
@returns {boolean}
*/
export default function containsSuspensionPoint(node, visitorKeys) {
	if (
		node.type === 'AwaitExpression'
		|| node.type === 'YieldExpression'
		|| (node.type === 'ForOfStatement' && node.await)
	) {
		return true;
	}

	if (isFunction(node)) {
		return false;
	}

	for (const key of visitorKeys[node.type] ?? []) {
		const child = node[key];
		for (const childNode of Array.isArray(child) ? child : [child]) {
			if (childNode?.type && containsSuspensionPoint(childNode, visitorKeys)) {
				return true;
			}
		}
	}

	return false;
}
