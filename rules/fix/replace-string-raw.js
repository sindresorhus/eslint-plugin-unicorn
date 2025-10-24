// Replace `StringLiteral` or `TemplateLiteral` node with raw text
const replaceStringRaw = (node, raw, context, fixer) =>
	fixer.replaceTextRange(
		// Ignore quotes and backticks
		[
			context.sourceCode.getRange(node)[0] + 1,
			context.sourceCode.getRange(node)[1] - 1,
		],
		raw,
	);

export default replaceStringRaw;
