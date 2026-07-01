import getPrecedence, {PRECEDENCE_UNARY} from './get-precedence.js';

/**
Check if parentheses should be added to a `node` when it's used as `argument` of `AwaitExpression`.

@param {Node} node - The AST node to check.
@returns {boolean}
*/
export default function shouldAddParenthesesToAwaitExpressionArgument(node) {
	// `await` has the same precedence as other unary operators.
	return getPrecedence(node) < PRECEDENCE_UNARY;
}
