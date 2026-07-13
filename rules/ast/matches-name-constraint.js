/**
Check a node against an optional name constraint.

`name` takes precedence over `names`. When neither is given, there is no constraint and the node matches.

@param {import('estree').Node} node
@param {string} [name]
@param {string[]} [names]
@returns {boolean}
*/
export default function matchesNameConstraint(node, name, names) {
	if (name) {
		return node.type === 'Identifier' && node.name === name;
	}

	if (!Array.isArray(names) || names.length === 0) {
		return true;
	}

	return node.type === 'Identifier' && names.includes(node.name);
}

/**
Whether a name constraint was given at all.

@param {string} [name]
@param {string[]} [names]
@returns {boolean}
*/
export function hasNameConstraint(name, names) {
	return Boolean(name) || (Array.isArray(names) && names.length > 0);
}
