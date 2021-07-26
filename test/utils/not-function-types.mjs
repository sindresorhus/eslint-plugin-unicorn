const notFunctionTypes = [
	// ArrayExpression
	'[]',
	'[element]',
	'[...elements]',
	// BinaryExpression
	'1 + fn',
	'"length" in fn',
	'fn instanceof Function',
	// ClassExpression
	'class ClassCantUseAsFunction {}',
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
	// UnaryExpression
	'- fn',
	'+ fn',
	'~ fn',
	'typeof fn',
	'void fn',
	'delete foo.fn',
	// UpdateExpression
	'++ fn',
	'-- fn',

	// Following are not safe
	'a = fn', // Could be a function
	// 'await fn', // This requires async function to test, ignore for now
	'fn()', // Could be a factory returns a function
	'fn1 || fn2', // Could be a function
	'new ClassReturnsFunction()', // `class` constructor could return a function
	'new Function()', // `function`
	'fn``', // Same as `CallExpression`
	'this', // Could be a function
];

export default notFunctionTypes;
