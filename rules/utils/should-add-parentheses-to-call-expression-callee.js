import getPrecedence, {PRECEDENCE_CALL} from './get-precedence.js';

/**
Check if parentheses should be added to a `node` when it's used as `callee` of `CallExpression`.

@param {Node} node - The AST node to check.
@returns {boolean}
*/
export default function shouldAddParenthesesToCallExpressionCallee(node) {
	// `new Foo` (without its own call parentheses) would absorb the call's `()` into its own
	// argument list (`new Foo()` instead of `(new Foo)()`), so it always needs parentheses
	// regardless of its precedence.
	return getPrecedence(node) < PRECEDENCE_CALL || node.type === 'NewExpression';
}
