'use strict';

const {
	isLiteral,
	isStringLiteral,
	isNumberLiteral,
	isBigIntLiteral,
	isNullLiteral,
	isRegexLiteral,
} = require('./literal.js');

module.exports = {
	isLiteral,
	isStringLiteral,
	isNumberLiteral,
	isBigIntLiteral,
	isNullLiteral,
	isRegexLiteral,

	isEmptyNode: require('./is-empty-node.js'),
	isStaticRequire: require('./is-static-require.js'),
	isUndefined: require('./is-undefined.js'),
};
