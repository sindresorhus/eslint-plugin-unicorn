'use strict';

function isFunction(node) {
	return node.type === 'FunctionDeclaration' ||
		node.type === 'FunctionExpression' ||
		node.type === 'ArrowFunctionExpression';
}

module.exports = isFunction;
