'use strict';

function isNodeMatchesDescription(node, description) {
	const names = description.split('.').reverse();
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

function isNodeMatches(node, descriptions) {
	return descriptions.some(description => isNodeMatchesDescription(node, description));
}

module.exports = isNodeMatches;
