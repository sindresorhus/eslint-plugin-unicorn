const replaceTemplateElement = (node, replacement, context, fixer) => {
	const {tail} = node;
	const [start, end] = context.sourceCode.getRange(node);
	return fixer.replaceTextRange(
		[start + 1, end - (tail ? 1 : 2)],
		replacement,
	);
};

export default replaceTemplateElement;
