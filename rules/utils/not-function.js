'use strict';

// AST Types:
// https://github.com/eslint/espree/blob/master/lib/ast-node-types.js#L18
// Only types possible to be `callee` or `argument` are listed
const impossibleNodeTypes = [
	'ArrayExpression',
	'ClassExpression',
	'Literal',
	'ObjectExpression',
	'TemplateLiteral',
	// Technically `this` could be a function, but most likely not
	'ThisExpression'
];

const notFunctionSelector = node => [
	...impossibleNodeTypes.map(type => `[${node}.type!="${type}"]`),
	`:not([${node}.type="Identifier"][${node}.name="undefined"])`
].join('');

module.exports = {
	notFunctionSelector
};
