const isDefinitionBeforeReference = (definition, referenceNode, context) =>
	context.sourceCode.getRange(definition.name)[0] <= context.sourceCode.getRange(referenceNode)[0];

export {
	isDefinitionBeforeReference,
};
