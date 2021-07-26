const notDomNodeTypes = [
	// ArrayExpression
	'[]',
	'[element]',
	'[...elements]',
	// ArrowFunctionExpression
	'() => {}',
	// ClassExpression
	'class Node {}',
	// FunctionExpression
	'function() {}',
	// Literal
	'0',
	'1',
	'0.1',
	'""',
	'"string"',
	'/regex/',
	'null',
	'0n',
	'1n',
	'true',
	'false',
	// ObjectExpression
	'{}',
	// TemplateLiteral
	'`templateLiteral`',
	// Undefined
	'undefined',
];

export default notDomNodeTypes;
