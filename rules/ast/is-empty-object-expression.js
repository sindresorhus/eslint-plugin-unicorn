const isEmptyArrayExpression = node =>
	node.type === 'ObjectExpression'
	&& node.properties.length === 0;

export default isEmptyArrayExpression;
