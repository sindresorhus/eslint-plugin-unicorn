import {findVariable} from '@eslint-community/eslint-utils';

/**
Get the initializer of a `const` variable referenced by an identifier node, or `undefined` if the node is not such a reference.

Destructured bindings (`const {foo} = bar`) return `undefined`, since the initializer is not the value of the binding.

@param {object} node
@param {import('eslint').Rule.RuleContext} context
@returns {object | undefined}
*/
export default function getConstVariableInitializer(node, context) {
	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (!variable || variable.defs.length !== 1) {
		return;
	}

	const [definition] = variable.defs;
	if (
		definition.type !== 'Variable'
		|| definition.node.type !== 'VariableDeclarator'
		|| definition.parent.type !== 'VariableDeclaration'
		// `definition.kind` is undefined under `@typescript-eslint/parser`, but `definition.parent` is the `VariableDeclaration` under both parsers
		|| definition.parent.kind !== 'const'
		|| definition.node.id !== definition.name
	) {
		return;
	}

	return definition.node.init;
}
