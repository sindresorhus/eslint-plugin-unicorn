const nonIterableNodeTypes = new Set([
	// `{}` has no `Symbol.iterator`, so a destructuring pattern throws on it
	'ObjectExpression',
	// `1 + 2` is a number, and a number is not iterable
	'BinaryExpression',
	'UnaryExpression',
	'UpdateExpression',
]);

/**
Check if `node` cannot be iterated, from its syntax alone.

Index access works on any array-like while a destructuring pattern needs `Symbol.iterator`, so a rewrite between the two is only safe when the value is not one of these. An unknown value, a `Set`, a string and a typed array are all iterable and are deliberately not reported here.

@param {Node} node
@returns {boolean}
*/
export default function isKnownNonIterable(node) {
	if (nonIterableNodeTypes.has(node.type)) {
		return true;
	}

	// `1`, `true` and `/re/` are not iterable. A string is, so it is left out.
	return node.type === 'Literal' && typeof node.value !== 'string';
}
