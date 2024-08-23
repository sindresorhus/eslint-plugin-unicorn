'use strict';

const {
	isLiteral,
	isStringLiteral,
	isNumberLiteral,
	isBigIntLiteral,
	isNullLiteral,
	isRegexLiteral,
} = require('./literal.js');
const {
	isNewExpression,
	isCallExpression,
	isCallOrNewExpression,
} = require('./call-or-new-expression.js');

module.exports = {
	isLiteral,
	isStringLiteral,
	isNumberLiteral,
	isBigIntLiteral,
	isNullLiteral,
	isRegexLiteral,

	isArrowFunctionBody: require('./is-arrow-function-body.js'),
	isCallExpression,
	isCallOrNewExpression,
	isDirective: require('./is-directive.js'),
	isEmptyNode: require('./is-empty-node.js'),
	isExpressionStatement: require('./is-expression-statement.js'),
	isFunction: require('./is-function.js'),
	isMemberExpression: require('./is-member-expression.js'),
	isMethodCall: require('./is-method-call.js'),
	isNegativeOne: require('./is-negative-one.js'),
	isNewExpression,
	isReferenceIdentifier: require('./is-reference-identifier.js'),
	isStaticRequire: require('./is-static-require.js'),
	isTaggedTemplateLiteral: require('./is-tagged-template-literal.js'),
	isUndefined: require('./is-undefined.js'),

	functionTypes: require('./function-types.js'),
};
