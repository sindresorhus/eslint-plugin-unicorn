import {hasSideEffect} from '@eslint-community/eslint-utils';
import {getParenthesizedText, isParenthesized, isBoolean} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-chained-comparison/error';
const MESSAGE_ID_SUGGESTION = 'no-chained-comparison/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Comparison operators cannot be chained. The inner comparison evaluates to a boolean, which is then compared instead of the operands.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `{{replacement}}`.',
};

const orderingOperators = new Set(['<', '>', '<=', '>=']);
const equalityOperators = new Set(['===', '!==', '==', '!=']);
const comparisonOperators = orderingOperators.union(equalityOperators);

const isComparison = node => node.type === 'BinaryExpression' && comparisonOperators.has(node.operator);
const isBooleanLiteral = node => node.type === 'Literal' && typeof node.value === 'boolean';

// The `&&` rewrite is a `LogicalExpression`, which binds looser than any comparison. It can only
// replace `node` where a surrounding operator won't recapture it: at the top of an expression or
// when already parenthesized, but not as an operand of another binary expression (`foo === a < b < c`)
// or mixed with `??` (which is a syntax error).
const isSafeForLogicalReplacement = (node, context) => {
	if (isParenthesized(node, context)) {
		return true;
	}

	const {parent} = node;
	return parent.type !== 'BinaryExpression'
		&& !(parent.type === 'LogicalExpression' && parent.operator === '??');
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('BinaryExpression', node => {
		if (!comparisonOperators.has(node.operator)) {
			return;
		}

		const nested = isComparison(node.left) ? node.left : node.right;
		if (!isComparison(nested)) {
			return;
		}

		const isNestedOnLeft = nested === node.left;
		const sibling = isNestedOnLeft ? node.right : node.left;

		// For equality operators, comparing a comparison result against another boolean value
		// (`(a > 0) === (b > 0)`, `(a < b) === true`, `(a > 0) !== Boolean(b)`) is an intentional
		// boolean comparison, not a chained comparison.
		if (
			equalityOperators.has(node.operator)
			&& isBoolean(sibling, context)
		) {
			return;
		}

		const problem = {
			node,
			messageId: MESSAGE_ID_ERROR,
		};

		// Only the canonical left-associative chain `(a OP1 b) OP2 c` has an unambiguous
		// `a OP1 b && b OP2 c` rewrite. The `&&` rewrite only reflects a plausible intent for a
		// real ordering or equality chain, so the inner and outer operators must be the same kind
		// and the outer operand must not be a boolean literal (`(a < b) < true` is not a range
		// check). The middle operand `b` is duplicated, so the rewrite must also be free of side
		// effects and comments.
		const isSameOperatorKind = orderingOperators.has(nested.operator) === orderingOperators.has(node.operator);
		const isPlausibleChain = isSameOperatorKind && !isBooleanLiteral(node.right);
		if (
			isNestedOnLeft
			&& isPlausibleChain
			// Both outer operands must be plain. A comparison at either end (`(a < b) < (c < d)`
			// or a deeper chain `a < b < c < d`) has no single unambiguous `&&` rewrite.
			&& !isComparison(node.right)
			&& !isComparison(nested.left)
			&& isSafeForLogicalReplacement(node, context)
			&& !hasSideEffect(nested.right, sourceCode)
			&& sourceCode.getCommentsInside(node).length === 0
		) {
			const replacement = `${sourceCode.getText(node.left)} && ${getParenthesizedText(nested.right, context)} ${node.operator} ${getParenthesizedText(node.right, context)}`;

			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data: {replacement},
					/** @param {import('eslint').Rule.RuleFixer} fixer */
					fix: fixer => fixer.replaceText(node, replacement),
				},
			];
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow chained comparisons such as `a < b < c`.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
