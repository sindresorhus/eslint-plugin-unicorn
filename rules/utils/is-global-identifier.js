import {findVariable} from '@eslint-community/eslint-utils';
import isUnresolvedVariable from './is-unresolved-variable.js';
import {isTypeOnlyDefinition} from './imports.js';

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

/**
Check if the global with the given name is not shadowed by a runtime binding in the scope of `node`, so code inserted there can use it. Type-only definitions (`type`, `interface`, and type-only imports) are ignored since they cannot shadow a runtime value.

@param {string} name - The global name, for example `'Array'`.
@param {import('estree').Node} node - The node whose scope is checked.
@param {import('eslint').Rule.RuleContext} context - The ESLint rule context.
@returns {boolean} Whether `name` refers to the global at `node`.
*/
export function isGlobalNameAvailable(name, node, context) {
	const variable = findVariable(context.sourceCode.getScope(node), name);
	return !variable || variable.defs.every(definition => isTypeOnlyDefinition(definition));
}
