const isDefinitionBeforeReference = (definition, referenceNode, context) =>
	context.sourceCode.getRange(definition.name)[0] <= context.sourceCode.getRange(referenceNode)[0];

function isUnassignedParameter(variable) {
	const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
	return definition?.type === 'Parameter'
		&& definition.node.params.includes(definition.name)
		&& variable.references.every(reference => !reference.isWrite())
		// In sloppy functions, writes through `arguments` can change the parameter.
		&& (variable.scope.isStrict || !variable.scope.set.get('arguments')?.references.length);
}

export {
	isDefinitionBeforeReference,
	isUnassignedParameter,
};
