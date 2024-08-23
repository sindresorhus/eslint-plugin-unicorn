'use strict';

const {isNumberLiteral} = require('./literal.js');

function isNegativeOne(node) {
	return node?.type === 'UnaryExpression'
		&& node.operator === '-'
		&& isNumberLiteral(node.argument)
		&& node.argument.value === 1;
}

module.exports = isNegativeOne;
