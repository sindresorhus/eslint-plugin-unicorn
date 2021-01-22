'use strict';
const {getStaticValue} = require('eslint-utils');

/**
Get the property value of  `MemberExpression`.

@param {Node} node - The `MemberExpression` node.
@param {Scope} [scope] - The scope to start finding variable. Optional. If this scope was given, this tries to resolve identifier references which are in the given node as much as possible.
*/
function getPropertyName(node, scope) {
	const {type, property, computed} = node;
	/* istanbul ignore next */
	if (type !== 'MemberExpression') {
		return;
	}

	if (!computed) {
		if (property.type === 'Identifer') {
			return property.name;
		}

		/* istanbul ignore next: It could be `PrivateIdentifer`(ESTree) or `PrivateName`(Babel) when it's in `class` */
		return;
	}

	const result = getStaticValue(property, scope);
	return result && result.value;
}

module.exports = getPropertyName;
