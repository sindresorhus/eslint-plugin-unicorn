'use strict';
const {getStaticValue} = require('eslint-utils');

function getKeyOrPropertyName(keyOrProperty, computed, scope) {
	if (!computed) {
		if (keyOrProperty.type === 'Identifier') {
			return keyOrProperty.name;
		}

		// It could be `PrivateIdentifier`(ESTree) or `PrivateName`(Babel) when it's in `class`
		/* c8 ignore next */
		return;
	}

	const result = getStaticValue(keyOrProperty, scope);
	return result && result.value;
}

/**
Get the key value of a node.

@param {Node} node - The node.
@param {Scope} [scope] - The scope to start finding the variable. Optional. If this scope was given, it tries to resolve identifier references which are in the given node as much as possible.
*/
function getKeyName(node, scope) {
	const {type, computed} = node;

	switch (type) {
		case 'MemberExpression':
			return getKeyOrPropertyName(node.property, computed, scope);
		case 'Property':
		case 'PropertyDefinition':
		case 'MethodDefinition':
			return getKeyOrPropertyName(node.key, computed, scope);
		// No default
	}
}

module.exports = getKeyName;
