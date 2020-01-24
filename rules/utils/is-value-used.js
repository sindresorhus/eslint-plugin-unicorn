'use strict';

module.exports = function (node) {
	const {parent} = node;

	return parent && parent.type !== 'ExpressionStatement';
};
