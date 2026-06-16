import {findVariable} from '@eslint-community/eslint-utils';

/**
Get the initializer of a `const` variable referenced by an identifier node, or `undefined` if the node is not such a reference.

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
		|| definition.parent.kind !== 'const'
	) {
		return;
	}

	return definition.node.init;
}
