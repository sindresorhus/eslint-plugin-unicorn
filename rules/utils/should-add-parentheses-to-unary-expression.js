import getPrecedence, {PRECEDENCE_UNARY} from './get-precedence.js';

/**
Check if parentheses should be added to a `node` when it's used as `argument` of `UnaryExpression`.

@param {Node} node - The AST node to check.
@param {string} operator - The UnaryExpression operator.
@returns {boolean}
*/
// Prefix unary operators all share the same precedence, so the same parenthesization rules apply.
const supportedOperators = new Set(['!', 'typeof', 'void', 'delete', '~', '+', '-']);

// These are same or higher precedence than `UnaryExpression`, but still look ambiguous as its
// argument without parentheses (`!x++`, `typeof x!`, `!<Foo>x`), so they get parenthesized too.
const alwaysParenthesizedTypes = new Set(['UpdateExpression', 'TSNonNullExpression', 'TSTypeAssertion']);

export default function shouldAddParenthesesToUnaryExpressionArgument(node, operator) {
	if (!supportedOperators.has(operator)) {
		throw new Error('Unexpected operator');
	}

	return getPrecedence(node) < PRECEDENCE_UNARY || alwaysParenthesizedTypes.has(node.type);
}
