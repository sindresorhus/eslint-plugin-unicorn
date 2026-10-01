/**
Check if a node is the `arguments` object.

`arguments` is a language binding that is never an `Array`, unlike an unknown identifier, so unlike most receivers its type does not have to be resolved to know what methods it has.

@param {Node} node
@returns {boolean}
*/
export default function isArgumentsObject(node) {
	return node.type === 'Identifier' && node.name === 'arguments';
}
