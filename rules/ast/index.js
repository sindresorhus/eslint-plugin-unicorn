'use strict';

const {
	isLiteral,
	isNumberLiteral,
	isStringLiteral,
	isRegexLiteral,
	isNullLiteral,
} = require('./literal.js');

module.exports = {
	isLiteral,
	isNumberLiteral,
	isStringLiteral,
	isRegexLiteral,
	isNullLiteral,

	isUndefined: require('./is-undefined.js'),
	isStaticRequire: require('./is-static-require.js'),
};
