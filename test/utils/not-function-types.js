'use strict';

module.exports = [
	// ArrayExpression
	'[]',
	'[element]',
	'[...elements]',
	// BinaryExpression
	'1 + fn',
	'"length" in fn',
	'fn instanceof Function',
	// ClassExpression
	'class Node {}',
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
	'delete fn',
	// UpdateExpression
	'++ fn',
	'-- fn',

	// Following are not safe
	'a = fn', // Could be a function
	// 'await fn', // This requires async function to test, ignore for now
	'fn()', // Could be a factory returns a function
	'false || fn', // Could be a function
	'new Fn()', // `class` constructor could return a function
	'new Function()', // `function`
	'fn``', // Same as `CallExpression`
	'this' // Could be a function
];
