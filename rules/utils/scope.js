const getDefinitionNode = definition =>
	definition.name ?? definition.node;

const isDefinitionBeforeReference = (definition, referenceNode, context) =>
	context.sourceCode.getRange(getDefinitionNode(definition))[0] <= context.sourceCode.getRange(referenceNode)[0];

const getVariableByName = (name, scope) => {
	while (scope) {
		const variable = scope.set.get(name);

		if (variable) {
			return variable;
		}

		scope = scope.upper;
	}
};

export {
	getVariableByName,
	isDefinitionBeforeReference,
};
