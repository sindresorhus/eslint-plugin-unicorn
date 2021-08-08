'use strict';

const isStaticRequire = node => Boolean(
	node
	&& node.type === 'CallExpression'
	&& node.callee
	&& node.callee.type === 'Identifier'
	&& node.callee.name === 'require'
	&& !node.optional
	&& node.arguments.length === 1
	&& node.arguments[0].type === 'Literal'
	&& typeof node.arguments[0].value === 'string',
);

module.exports = isStaticRequire;
