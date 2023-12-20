'use strict';
const functionTypes = require('./function-types.js');

function isFunction(node) {
	return functionTypes.includes(node.type);
}

module.exports = isFunction;
