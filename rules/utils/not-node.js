'use strict';

// AST Types:
// https://github.com/eslint/espree/blob/master/lib/ast-node-types.js#L18
// Only types possible to be `callee` or `argument` listed
const impossibleTypes = new Set([
	'ArrayExpression',
	'ArrowFunctionExpression',
	'ClassExpression',
	'FunctionExpression',
	'Literal',
	'ObjectExpression',
	// This could be a `Node` in arguments, like `call(...[node])`, but we are ignoring it
	'SpreadElement',
	'TemplateLiteral'
]);

module.exports = node => impossibleTypes.has(node.type) ||
	(node.type === 'Identifier' && node.name === 'undefined');
