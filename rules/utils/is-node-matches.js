'use strict';

function isNodeMatchesPath(node, path) {
	const names = path.split('.').reverse();
	for (const [index, name] of names.entries()) {
		if (index === names.length - 1) {
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

	return true;
}

/**
Check if node matches any object path.

@param {Node} node - The AST node to check.
@param {string[]} paths - The object paths.
@returns {boolean}
*/
function isNodeMatches(node, paths) {
	return paths.some(path => isNodeMatchesPath(node, path));
}

module.exports = isNodeMatches;
