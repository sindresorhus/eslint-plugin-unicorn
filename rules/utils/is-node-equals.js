'use strict';

const ignoreKeys = new Set(['loc', 'start', 'end', 'parent', 'range']);

/**
Compare two AST nodes for equality by structure and value.
Different from `deepStrictEqual` in that it ignores `loc`, `start`, `end`, `parent`, and `range` properties.
Different from `isSameReference` in that `isSameReference` just checks if the nodes are the same reference, but cannot compare two identical data.

eg.:
```js
const node1 = { foo: bar }
const node2 = { foo: bar }
```

isNodesEqual(node1, node2) => true
isSameReference(node1, node2) => false

@param {import('estree').Node} node1 - The first AST node.
@param {import('estree').Node} node2 - The second AST node.
@returns {boolean} - True if the nodes are structurally and value-wise equal, false otherwise.
*/
function isNodesEqual(node1, node2) {
	if (node1 === node2) {
		return true;
	}

	if (typeof node1 === 'string' || typeof node1 === 'boolean' || typeof node1 === 'number') {
		return node1 === node2;
	}

	// If one of them is null or undefined, they are not equal
	if (!node1 || !node2) {
		return false;
	}

	// If they are of different types, they are not equal
	if (node1.type !== node2.type) {
		return false;
	}

	if (node1.type === 'Literal') {
		return node1.value === node2.value;
	}

	// Compare properties recursively
	for (const key in node1) {
		if (Object.hasOwn(node1, key) && !ignoreKeys.has(key) && !isNodesEqual(node1[key], node2[key])) {
			return false;
		}
	}

	return true;
}

module.exports = isNodesEqual;
