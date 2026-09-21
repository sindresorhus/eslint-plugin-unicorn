const getTemplateElementRaw = (node, context) => context.sourceCode
	.getText(node)
	.slice(1, node.tail ? -1 : -2);

export default getTemplateElementRaw;
