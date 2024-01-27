'use strict';
const {isMethodCall} = require('../ast/index.js');

const isPromiseMethodWithArray = (node, methods) =>
	isMethodCall(node, {
		object: 'Promise',
		methods,
		optionalMember: false,
		optionalCall: false,
		argumentsLength: 1,
	})
	&& node.arguments[0].type === 'ArrayExpression';

module.exports = isPromiseMethodWithArray;
