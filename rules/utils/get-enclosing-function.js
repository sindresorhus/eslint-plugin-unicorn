import {isFunction} from '../ast/index.js';

/**
Get the closest function that contains a node, not including the node itself.

@param {import('estree').Node} node
@returns {import('estree').Function | undefined}
*/
export default function getEnclosingFunction(node) {
	for (let current = node.parent; current; current = current.parent) {
		if (isFunction(current)) {
			return current;
		}
	}
}
