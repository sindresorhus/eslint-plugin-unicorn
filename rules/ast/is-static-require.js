'use strict';

const {isStringLiteral, isCallExpression} = require('./literal.js');

const isStaticRequire = node =>
	isCallExpression({
		name: 'require',
		argumentsLength: 1,
		optional: false,
	})
	&& isStringLiteral(node.arguments[0]);

module.exports = isStaticRequire;
