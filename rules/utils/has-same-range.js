const hasSameRange = (node1, node2, context) =>
	node1
	&& node2
	&& context.sourceCode.getRange(node1)[0] === context.sourceCode.getRange(node2)[0]
	&& context.sourceCode.getRange(node1)[1] === context.sourceCode.getRange(node2)[1];

export default hasSameRange;
