'use strict';
const {isUndefined, isCallExpression, isMethodCall} = require('../ast/index.js');

// AST Types:
// https://github.com/eslint/espree/blob/master/lib/ast-node-types.js#L18
// Only types possible to be `callee` or `argument` are listed
const impossibleNodeTypes = new Set([
	'ArrayExpression',
	'ArrowFunctionExpression',
	'ClassExpression',
	'FunctionExpression',
	'Literal',
	'ObjectExpression',
	'TemplateLiteral',
]);

const isNodeValueNotDomNode = node =>
	impossibleNodeTypes.includes(node.type)
	|| isUndefined(node);

module.exports = isNodeValueNotDomNode;
