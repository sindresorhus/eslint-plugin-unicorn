'use strict';
const {getStaticValue} = require('eslint-utils');

// TODO[@fisker]: Merge this with `./get-property-name.js`

/**
Get the key value of a node.

@param {Node} node - The node.
@param {Scope} [scope] - The scope to start finding the variable. Optional. If this scope was given, it tries to resolve identifier references which are in the given node as much as possible.
*/
function getKeyName(node, scope) {
	const {type, key, computed} = node;

	/* istanbul ignore next - Prevent unexpected case */
	if (
		type !== 'Property'
		&& type !== 'PropertyDefinition'
		&& type !== 'MethodDefinition'
	) {
		return;
	}

	if (!computed) {
		if (key.type === 'Identifier') {
			return key.name;
		}

		/* istanbul ignore next: It could be `PrivateIdentifier`(ESTree) or `PrivateName`(Babel) when it's in `class` */
		return;
	}

	const result = getStaticValue(key, scope);
	return result && result.value;
}

module.exports = getKeyName;
