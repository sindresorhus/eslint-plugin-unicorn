const isDefinitionBeforeReference = (definition, referenceNode, context) =>
	context.sourceCode.getRange(definition.name)[0] <= context.sourceCode.getRange(referenceNode)[0];

function isUnassignedParameter(variable) {
	const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
	// In strict mode, `arguments` does not alias parameters.
	return definition?.type === 'Parameter'
		&& definition.node.params?.includes(definition.name) === true
		&& variable.references.every(reference => !reference.isWrite());
}

const getIdentifierReference = (identifier, scope) => {
	while (scope) {
		const reference = scope.references.find(reference => reference.identifier === identifier);
		if (reference) {
			return reference;
		}

		scope = scope.upper;
	}
};

export {
	getIdentifierReference,
	isDefinitionBeforeReference,
	isUnassignedParameter,
};
