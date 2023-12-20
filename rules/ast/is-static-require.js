'use strict';

const {isStringLiteral} = require('./literal.js');
const {isCallExpression} = require('./call-or-new-expression.js');

const isStaticRequire = node =>
	isCallExpression(node, {
		name: 'require',
		argumentsLength: 1,
		optional: false,
	})
	&& isStringLiteral(node.arguments[0]);

module.exports = isStaticRequire;
