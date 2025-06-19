/**
Checks if the given identifier node is shadowed in the given scope.

@param {string} node The identifier node to check
@param {Object} scope The current scope.
@returns {boolean} Whether or not the name is shadowed.
*/
export default function isUnresolvedVariable(node, context) {
	const scope = context.sourceCode.getScope(node);
	const reference = scope.references
		.find(reference => reference.identifier === node);
	return !reference.resolved;
}
