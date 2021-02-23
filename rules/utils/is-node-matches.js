'use strict';

function isNodeMatchesNameOrPath(node, nameOrPath) {
	const names = nameOrPath.split('.');
	for (let index = names.length - 1; index >= 0; index--) {
		const name = names[index];

		if (index === 0) {
			return node.type === 'Identifier' && node.name === name;
		}

		if (
			node.type !== 'MemberExpression' ||
			node.optional ||
			node.property.type !== 'Identifier' ||
			node.property.name !== name
		) {
			return false;
		}

		node = node.object;
	}
}

/**
Check if node matches any object name or key path.

@param {Node} node - The AST node to check.
@param {string[]} nameOrPaths - The object name or key paths.
@returns {boolean}
*/
function isNodeMatches(node, nameOrPaths) {
	return nameOrPaths.some(nameOrPath => isNodeMatchesNameOrPath(node, nameOrPath));
}

module.exports = {
	isNodeMatchesNameOrPath,
	isNodeMatches
};
