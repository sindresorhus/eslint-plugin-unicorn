const isEmptyArrayExpression = node =>
	node.type === 'ArrayExpression'
	&& node.elements.length === 0;

export default isEmptyArrayExpression;
