'use strict';

const isDirective = node =>
	node.type === 'ExpressionStatement'
	&& typeof node.directive === 'string';

module.exports = isDirective;
