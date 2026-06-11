import isUnresolvedVariable from './is-unresolved-variable.js';

/**
Checks if the given node is an identifier referencing a global binding, either a configured global or an unresolved (implicit) global, and not a local or imported variable that shadows it.

@param {import('estree').Node} node - The node to check.
@param {import('eslint').Rule.RuleContext} context - The ESLint rule context.
@returns {boolean} Whether the node is a global identifier.
*/
export default function isGlobalIdentifier(node, context) {
	return node.type === 'Identifier'
		&& (context.sourceCode.isGlobalReference(node) || isUnresolvedVariable(node, context));
}
