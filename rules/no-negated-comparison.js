import {
	removeParentheses,
	fixSpaceAroundKeyword,
	addParenthesesToReturnOrThrowExpression,
} from './fix/index.js';
import {
	isParenthesized,
	isOnSameLine,
	needsSemicolon,
} from './utils/index.js';
import {
	getBinaryExpressionWithReplacedOperatorText,
	getPunctuatorBinaryExpressionOperatorToken,
	hasLowerLogicalOperatorPrecedence,
	negatedEqualityOperators,
	negatedLogicalOperators,
} from './utils/comparison.js';

const MESSAGE_ID_ERROR = 'no-negated-comparison/error';
const MESSAGE_ID_LOGICAL_ERROR = 'no-negated-comparison/logical-error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer the opposite comparison instead of negating the whole comparison.',
	[MESSAGE_ID_LOGICAL_ERROR]: 'Prefer the opposite comparisons instead of negating the whole logical expression.',
};

const defaultOptions = {
	checkLogicalExpressions: false,
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkLogicalExpressions: {
				type: 'boolean',
				description: 'Check logical expressions that only contain equality comparisons.',
			},
		},
	},
];

const isNegation = node =>
	node.type === 'UnaryExpression'
	&& node.operator === '!'
	&& node.prefix
	&& !(
		node.parent.type === 'UnaryExpression'
		&& node.parent.operator === '!'
		&& node.parent.argument === node
	);

/*
Only equality operators, never the relational ones, and it must stay that way.

`!(a > b)` is not equivalent to `a <= b` when an operand is not a comparable number: every relational comparison with `NaN` is false, so the negated form is how code rejects `NaN`, `undefined`, and non-numbers, as in `if (!(options.factor > 0))`, which the opposite operator silently accepts.

A census of 8564 source files found three negated relational comparisons, and all three were deliberate guards of that kind, so reporting them would be almost entirely false positives. Do not add them back behind an option either: the precondition for enabling it safely, that no operand is ever a non-number, cannot be verified for a whole codebase.

Do not reintroduce a heuristic that exempts only the operands that look risky. An earlier optional-chaining exemption covered under 3% of occurrences and made `!(a?.b >= 2)` and `!(chr >= 0)` behave differently for the same underlying reason. See #3510 and #3588.
*/
const isEqualityComparison = node =>
	node.type === 'BinaryExpression'
	&& negatedEqualityOperators.has(node.operator);

const containsOnlyEqualityComparisons = node =>
	isEqualityComparison(node)
	|| (
		node.type === 'LogicalExpression'
		&& negatedLogicalOperators.has(node.operator)
		&& containsOnlyEqualityComparisons(node.left)
		&& containsOnlyEqualityComparisons(node.right)
	);

const parentNeedsGroupedComparison = parent => [
	'AwaitExpression',
	'BinaryExpression',
	'SpreadElement',
	'TSAsExpression',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
	'UnaryExpression',
	'YieldExpression',
].includes(parent.type);

// `return`/`throw` followed by a line break needs the expression wrapped, otherwise removing the `!` makes ASI turn it into a bare `return;`/`throw;`.
const needsReturnOrThrowParentheses = (unaryExpression, context) => {
	const {parent} = unaryExpression;
	const {sourceCode} = context;
	const bangToken = sourceCode.getFirstToken(unaryExpression);

	return (parent.type === 'ReturnStatement' || parent.type === 'ThrowStatement')
		&& parent.argument === unaryExpression
		&& !isOnSameLine(bangToken, sourceCode.getTokenAfter(bangToken), context)
		&& !isParenthesized(unaryExpression, context);
};

function * fix({
	fixer,
	context,
	unaryExpression,
	comparison,
	replacementOperator,
}) {
	const {sourceCode} = context;
	const bangToken = sourceCode.getFirstToken(unaryExpression);
	const tokenAfterBangIncludingComments = sourceCode.getTokenAfter(bangToken, {includeComments: true});
	const operatorToken = getPunctuatorBinaryExpressionOperatorToken(comparison, context);
	const {parent} = unaryExpression;
	const shouldAddReturnOrThrowParentheses = needsReturnOrThrowParentheses(unaryExpression, context);

	if (!shouldAddReturnOrThrowParentheses) {
		yield fixSpaceAroundKeyword(fixer, unaryExpression, context);
	}

	yield fixer.remove(bangToken);
	if (
		tokenAfterBangIncludingComments.type === 'Block'
		&& sourceCode.text[sourceCode.getRange(tokenAfterBangIncludingComments)[1]] === '('
	) {
		yield fixer.insertTextAfter(tokenAfterBangIncludingComments, ' ');
	}

	const shouldKeepParentheses = parentNeedsGroupedComparison(parent) && !isParenthesized(unaryExpression, context);
	if (!shouldKeepParentheses) {
		yield removeParentheses(comparison, fixer, context);
	}

	yield fixer.replaceText(operatorToken, replacementOperator);

	if (shouldAddReturnOrThrowParentheses) {
		yield addParenthesesToReturnOrThrowExpression(fixer, parent, context);
		return;
	}

	// When the parentheses are kept, the fixed expression starts with `(`, not with the comparison.
	const firstTokenValue = shouldKeepParentheses ? '(' : sourceCode.getFirstToken(comparison).value;
	const tokenBefore = sourceCode.getTokenBefore(unaryExpression);
	if (needsSemicolon(tokenBefore, context, firstTokenValue)) {
		yield fixer.insertTextBefore(unaryExpression, ';');
	}
}

const getFixedLogicalExpressionText = (node, context, parentOperator) => {
	if (isEqualityComparison(node)) {
		return getBinaryExpressionWithReplacedOperatorText(
			node,
			context,
			negatedEqualityOperators.get(node.operator),
		);
	}

	const operator = negatedLogicalOperators.get(node.operator);
	const text = [
		getFixedLogicalExpressionText(node.left, context, operator),
		operator,
		getFixedLogicalExpressionText(node.right, context, operator),
	].join(' ');
	const needsParentheses = parentOperator && (
		(
			operator !== parentOperator
			&& isParenthesized(node, context)
		)
		|| hasLowerLogicalOperatorPrecedence(operator, parentOperator)
	);

	return needsParentheses
		? `(${text})`
		: text;
};

function * fixLogical({
	fixer,
	context,
	unaryExpression,
	logicalExpression,
}) {
	const {sourceCode} = context;
	const bangToken = sourceCode.getFirstToken(unaryExpression);
	const tokenAfterBang = sourceCode.getTokenAfter(bangToken);
	const {parent} = unaryExpression;
	const shouldAddReturnOrThrowParentheses = needsReturnOrThrowParentheses(unaryExpression, context);

	if (!shouldAddReturnOrThrowParentheses) {
		yield fixSpaceAroundKeyword(fixer, unaryExpression, context);
	}

	yield fixer.remove(bangToken);
	yield fixer.replaceText(logicalExpression, getFixedLogicalExpressionText(logicalExpression, context));

	if (shouldAddReturnOrThrowParentheses) {
		yield addParenthesesToReturnOrThrowExpression(fixer, parent, context);
		return;
	}

	const tokenBefore = sourceCode.getTokenBefore(unaryExpression);
	if (needsSemicolon(tokenBefore, context, tokenAfterBang.value)) {
		yield fixer.insertTextBefore(unaryExpression, ';');
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const [{checkLogicalExpressions}] = context.options;

	context.on('UnaryExpression', unaryExpression => {
		if (!isNegation(unaryExpression)) {
			return;
		}

		const {argument} = unaryExpression;

		if (isEqualityComparison(argument)) {
			const comparison = argument;

			return {
				node: unaryExpression,
				messageId: MESSAGE_ID_ERROR,
				fix: fixer => fix({
					fixer,
					context,
					unaryExpression,
					comparison,
					replacementOperator: negatedEqualityOperators.get(comparison.operator),
				}),
			};
		}

		if (
			!checkLogicalExpressions
			|| argument.type !== 'LogicalExpression'
			|| !containsOnlyEqualityComparisons(argument)
		) {
			return;
		}

		const logicalExpression = argument;
		const problem = {
			node: unaryExpression,
			messageId: MESSAGE_ID_LOGICAL_ERROR,
		};

		if (context.sourceCode.getCommentsInside(unaryExpression).length > 0) {
			return problem;
		}

		problem.fix = fixer => fixLogical({
			fixer,
			context,
			unaryExpression,
			logicalExpression,
		});

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow negated comparisons.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema,
		defaultOptions: [defaultOptions],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
