import getExpressionText from './get-expression-text.js';
import shouldAddParenthesesToUnaryExpressionArgument from './should-add-parentheses-to-unary-expression.js';

/**
Get the text of `node` negated with `!`, adding parentheses when needed. For example, `foo` becomes `!foo` and `a || b` becomes `!(a || b)`.

Redundant parentheses around `node` are dropped, unless they contain comments.

@param {import('estree').Node} node
@param {import('eslint').Rule.RuleContext} context
@returns {string}
*/
export default function getNegatedExpressionText(node, context) {
	return `!${getExpressionText(node, context, shouldAddParenthesesToUnaryExpressionArgument(node, '!'))}`;
}
