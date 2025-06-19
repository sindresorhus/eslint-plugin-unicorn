/**
Checks if the given identifier node is shadowed in the given scope.

@param {string} node The identifier node to check
@param {import('eslint').Rule.RuleContext} context The ESLint rule context.
@returns {boolean} Whether or not the name is unresolved.
*/
export default function isUnresolvedVariable(node, context) {
	const scope = context.sourceCode.getScope(node);
	const reference = scope.references
		.find(reference => reference.identifier === node);
	return !reference.resolved;
}
