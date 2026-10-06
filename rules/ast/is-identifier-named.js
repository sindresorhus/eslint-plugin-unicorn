/**
Check if the node is an identifier with the given name.

@param {import('estree').Node | undefined} node
@param {string} name
@returns {boolean}
*/
export default function isIdentifierNamed(node, name) {
	return node?.type === 'Identifier' && node.name === name;
}
