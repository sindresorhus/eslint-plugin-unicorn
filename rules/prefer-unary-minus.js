import {needsSemicolon, shouldAddParenthesesToUnaryExpressionArgument} from './utils/index.js';
import {isNegativeOne} from './ast/index.js';

const MESSAGE_ID = 'prefer-unary-minus';
const messages = {
	[MESSAGE_ID]: 'Prefer the unary minus operator over {{operation}} by `-1`.',
};

/**
Get the operand that is being negated by multiplying or dividing by `-1`, or `undefined`.

`x * -1` and `-1 * x` negate `x` (multiplication is commutative). `x / -1` negates `x`, but `-1 / x` does not (division is not commutative). When both operands are `-1` (`-1 * -1`, `-1 / -1`) there is nothing to simplify.

@param {import('estree').BinaryExpression} node
@returns {import('estree').Expression | undefined}
*/
const getNegatedOperand = node => {
	const {operator, left, right} = node;

	if (operator === '*') {
		if (isNegativeOne(right) && !isNegativeOne(left)) {
			return left;
		}

		if (isNegativeOne(left) && !isNegativeOne(right)) {
			return right;
		}

		return;
	}

	if (operator === '/' && isNegativeOne(right) && !isNegativeOne(left)) {
		return left;
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('BinaryExpression', node => {
		const operand = getNegatedOperand(node);
		if (!operand) {
			return;
		}

		const problem = {
			node,
			messageId: MESSAGE_ID,
			data: {operation: node.operator === '*' ? 'multiplying' : 'dividing'},
		};

		// A comment around the `*`/`/`/`-1` tokens would be dropped by the fix, so skip it.
		if (sourceCode.getCommentsInside(node).length > 0) {
			return problem;
		}

		problem.fix = fixer => {
			const text = sourceCode.getText(operand);

			// `-y * -1` → `-(-y)`; a bare `--y` would be parsed as a decrement. `UnaryExpression` is
			// intentionally absent from the helper's list, so handle the `-` operator here.
			const isNegativeUnary = operand.type === 'UnaryExpression' && operand.operator === '-';
			const needsParentheses = shouldAddParenthesesToUnaryExpressionArgument(operand, '-') || isNegativeUnary;
			let replacement = needsParentheses ? `-(${text})` : `-${text}`;

			const tokenBefore = sourceCode.getTokenBefore(node);
			if (needsSemicolon(tokenBefore, context, replacement)) {
				// ASI: `foo\nx * -1` would otherwise become `foo - x` after the fix.
				replacement = `;${replacement}`;
			} else if (
				tokenBefore?.value === '-'
				&& sourceCode.getRange(tokenBefore)[1] === sourceCode.getRange(node)[0]
			) {
				// Token merge: `a-x*-1` must not become `a--x` (a decrement).
				replacement = ` ${replacement}`;
			}

			return fixer.replaceText(node, replacement);
		};

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer the unary minus operator over multiplying or dividing by `-1`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
