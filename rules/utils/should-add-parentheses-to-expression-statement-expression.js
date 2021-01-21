'use strict';

/**
Check if parentheses should to be added to a `node` when it's used as an `expression` of `ExpressionStatement`.

@param {Node} node - The AST node to check.
@param {SourceCode} sourceCode - The source code object.
@returns {boolean}
*/
function shouldAddParenthesesToExpressionStatementExpression({type, left}) {
	switch (type) {
		case 'ObjectExpression':
			return true;
		case 'AssignmentExpression':
			return left.type === 'ObjectPattern' || left.type === 'ArrayPattern';
		default:
			return false;
	}
}

module.exports = shouldAddParenthesesToExpressionStatementExpression;
