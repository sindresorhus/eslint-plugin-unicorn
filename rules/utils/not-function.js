'use strict';

// AST Types:
// https://github.com/eslint/espree/blob/master/lib/ast-node-types.js#L18
// Only types possible to be `argument` are listed
const impossibleNodeTypes = [
	'ArrayExpression',
	'BinaryExpression',
	'ClassExpression',
	'Literal',
	'ObjectExpression',
	'TemplateLiteral',
	'UnaryExpression',
	'UpdateExpression'
];

// Technically these nodes could be a function, but most likely not
const mostLikelyNotNodeTypes = [
	'AssignmentExpression',
	'AwaitExpression',
	'CallExpression',
	'LogicalExpression',
	'NewExpression',
	'TaggedTemplateExpression',
	'ThisExpression'
];

const notFunctionSelector = node => [
	...[...impossibleNodeTypes, ...mostLikelyNotNodeTypes].map(type => `[${node}.type!="${type}"]`),
	`:not([${node}.type="Identifier"][${node}.name="undefined"])`
].join('');

module.exports = {
	notFunctionSelector
};
