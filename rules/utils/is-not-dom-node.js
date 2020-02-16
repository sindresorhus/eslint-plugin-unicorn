'use strict';

// AST Types:
// https://github.com/eslint/espree/blob/master/lib/ast-node-types.js#L18
// Only types possible to be `callee` or `argument` listed
const impossibleTypes = [
	'ArrayExpression',
	'ArrowFunctionExpression',
	'ClassExpression',
	'FunctionExpression',
	'Literal',
	'ObjectExpression',
	// This could be a `Node` in arguments, like `call(...[node])`, but we are ignoring it
	'SpreadElement',
	'TemplateLiteral'
];

const isNotDomNode = node => {
	return impossibleTypes.includes(node.type) ||
	(node.type === 'Identifier' && node.name === 'undefined');
};

const isNotDomNodeSelector = options => {
	const {node} = options;

	return [
		...impossibleTypes.map(type => `[${node}.type!="${type}"]`),
		`:not([${node}.type="Identifier"][${node}.name="undefined"])`
	].join('');
};

module.exports = {
	isNotDomNode,
	isNotDomNodeSelector
};
