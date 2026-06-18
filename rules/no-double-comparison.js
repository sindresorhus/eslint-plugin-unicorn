import {getParenthesizedRange, getParenthesizedText} from './utils/index.js';
import {
	comparisonOperators,
	containsOptionalChain,
	flipOperator,
	isSame,
	unwrapExpression,
} from './utils/comparison.js';

const MESSAGE_ID = 'no-double-comparison';
const MESSAGE_ID_SUGGESTION = 'no-double-comparison/suggestion';
const messages = {
	[MESSAGE_ID]: 'These comparisons can be simplified to `{{replacement}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `{{replacement}}`.',
};

// Map of `<logical-operator> <comparison operators>` to the combined operator. The two comparison operators are registered in both orders so the lookup is order-independent.
const reductionKey = (logicalOperator, first, second) => `${logicalOperator} ${first} ${second}`;
const reductions = new Map();
for (const [logicalOperator, [first, second], result] of [
	['||', ['===', '<'], {operator: '<='}],
	['||', ['===', '>'], {operator: '>='}],
	['||', ['<', '>'], {operator: '!=='}],
	['&&', ['<=', '>='], {operator: '==='}],
	['&&', ['<=', '!=='], {operator: '<'}],
	['&&', ['>=', '!=='], {operator: '>'}],
]) {
	reductions.set(reductionKey(logicalOperator, first, second), result);
	reductions.set(reductionKey(logicalOperator, second, first), result);
}

const isComparison = node =>
	node.type === 'BinaryExpression'
	&& comparisonOperators.has(node.operator)
	&& !containsOptionalChain(node);

// Whether a comment falls within an operand, including its surrounding parentheses, since operands are reused with their parentheses.
const isCommentWithinOperand = (comment, operand, context) => {
	const {sourceCode} = context;
	const [commentStart, commentEnd] = sourceCode.getRange(comment);
	const [operandStart, operandEnd] = getParenthesizedRange(operand, context);
	return commentStart >= operandStart && commentEnd <= operandEnd;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('LogicalExpression', node => {
		if (node.operator !== '||' && node.operator !== '&&') {
			return;
		}

		const left = unwrapExpression(node.left);
		const right = unwrapExpression(node.right);

		if (!isComparison(left) || !isComparison(right)) {
			return;
		}

		// The two comparisons must constrain the same pair of operands. The operands may appear in the same order or flipped; when flipped, normalize the right operator so the lookup and fix use the left comparison's operand order.
		let rightOperator;
		if (isSame(left.left, right.left) && isSame(left.right, right.right)) {
			rightOperator = right.operator;
		} else if (isSame(left.left, right.right) && isSame(left.right, right.left)) {
			rightOperator = flipOperator[right.operator];
		} else {
			return;
		}

		const reduction = reductions.get(reductionKey(node.operator, left.operator, rightOperator));
		if (!reduction) {
			return;
		}

		const leftText = getParenthesizedText(left.left, context);
		const rightText = getParenthesizedText(left.right, context);
		const replacement = `${leftText} ${reduction.operator} ${rightText}`;

		const problem = {
			node,
			messageId: MESSAGE_ID,
			data: {replacement},
		};

		// Replacing the whole expression reuses only the left comparison's operands, so a comment outside both of them would be dropped.
		const hasDroppedComment = sourceCode.getCommentsInside(node)
			.some(comment => !isCommentWithinOperand(comment, left.left, context) && !isCommentWithinOperand(comment, left.right, context));
		if (hasDroppedComment) {
			return problem;
		}

		const fix = fixer => fixer.replaceText(node, replacement);
		problem.suggest = [{messageId: MESSAGE_ID_SUGGESTION, data: {replacement}, fix}];

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow two comparisons of the same operands that can be combined into one.',
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
