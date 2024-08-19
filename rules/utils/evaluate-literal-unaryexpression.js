'use strict';

/**
Evaluate the value of a UnaryExpression node which contain a Literal node.
Make sure to call this function only when you are sure that the node is a UnaryExpression node or Literal node.

@param {import('estree').Node} node
@returns
*/
module.exports = function evaluateLiteralUnaryExpression(node) {
	// Base case: if the argument is a numeric literal, return its value directly
	if (node.type === 'Literal') {
		return node.value;
	}

	// If the argument is another UnaryExpression, recursively evaluate its value
	if (node.type === 'UnaryExpression') {
		const argumentValue = evaluateLiteralUnaryExpression(node.argument);

		switch (node.operator) {
			case '-': {
				return -argumentValue;
			}

			case '+': {
				return Number(argumentValue);
			}

			case '~': {
				return ~argumentValue; // eslint-disable-line no-bitwise
			}

			case '!': {
				return !argumentValue;
			}

			default:
		}
	}
};
