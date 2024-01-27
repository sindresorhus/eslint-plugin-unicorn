'use strict';
const {isMethodCall} = require('../ast/index.js');

const isPromiseMethodWithArray = (node, methods) =>
	node.callee.type === 'MemberExpression'
	&& node.callee.object.type === 'Identifier'
	&& node.callee.object.name === 'Promise'
	&& isMethodCall(node, methods)
	&& node.arguments.length === 1
	&& node.arguments[0].type === 'ArrayExpression';

module.exports = isPromiseMethodWithArray;
