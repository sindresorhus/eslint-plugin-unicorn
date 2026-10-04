/**
Check if a node is the queried name of a TypeScript type query (`typeof foo` or `typeof foo.bar` in a type position), which is a type position, not a runtime reference.

@param {import('estree').Node} node
@returns {boolean}
*/
export default function isInTypeQuery(node) {
	let current = node;
	while (current.parent?.type === 'TSQualifiedName') {
		current = current.parent;
	}

	return current.parent?.type === 'TSTypeQuery';
}
