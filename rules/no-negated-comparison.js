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
	negatedComparisonOperators,
	negatedEqualityOperators,
	negatedLogicalOperators,
} from './utils/comparison.js';

const MESSAGE_ID_ERROR = 'no-negated-comparison/error';
const MESSAGE_ID_LOGICAL_ERROR = 'no-negated-comparison/logical-error';
const MESSAGE_ID_SUGGESTION = 'no-negated-comparison/suggestion';
const MESSAGE_ID_LOGICAL_SUGGESTION = 'no-negated-comparison/logical-suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer the opposite comparison instead of negating the whole comparison.',
	[MESSAGE_ID_LOGICAL_ERROR]: 'Prefer the opposite comparisons instead of negating the whole logical expression.',
	[MESSAGE_ID_SUGGESTION]: 'Switch to `{{operator}}`.',
	[MESSAGE_ID_LOGICAL_SUGGESTION]: 'Switch to opposite comparisons.',
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
				description: 'Check logical expressions that only contain comparisons.',
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

const isComparison = node =>
	node.type === 'BinaryExpression'
	&& negatedComparisonOperators.has(node.operator);

const isLogicalExpressionWithOnlyComparisons = node =>
	isComparison(node)
	|| (
		node.type === 'LogicalExpression'
		&& negatedLogicalOperators.has(node.operator)
		&& isLogicalExpressionWithOnlyComparisons(node.left)
		&& isLogicalExpressionWithOnlyComparisons(node.right)
	);

const isSafelyFixableLogicalExpression = node =>
	isComparison(node)
		? negatedEqualityOperators.has(node.operator)
		: isSafelyFixableLogicalExpression(node.left) && isSafelyFixableLogicalExpression(node.right);

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

function * fix({
	fixer,
	context,
	unaryExpression,
	comparison,
	replacementOperator,
}) {
	const {sourceCode} = context;
	const bangToken = sourceCode.getFirstToken(unaryExpression);
	const tokenAfterBang = sourceCode.getTokenAfter(bangToken);
	const tokenAfterBangIncludingComments = sourceCode.getTokenAfter(bangToken, {includeComments: true});
	const operatorToken = getPunctuatorBinaryExpressionOperatorToken(comparison, context);
	const {parent} = unaryExpression;
	const needsReturnOrThrowParentheses = (
		(parent.type === 'ReturnStatement' || parent.type === 'ThrowStatement')
		&& parent.argument === unaryExpression
		&& !isOnSameLine(bangToken, tokenAfterBang, context)
		&& !isParenthesized(unaryExpression, context)
	);

	if (!needsReturnOrThrowParentheses) {
		yield fixSpaceAroundKeyword(fixer, unaryExpression, context);
	}

	yield fixer.remove(bangToken);
	if (
		tokenAfterBangIncludingComments.type === 'Block'
		&& sourceCode.text[sourceCode.getRange(tokenAfterBangIncludingComments)[1]] === '('
	) {
		yield fixer.insertTextAfter(tokenAfterBangIncludingComments, ' ');
	}

	if (!(
		parentNeedsGroupedComparison(parent)
		&& !isParenthesized(unaryExpression, context)
	)) {
		yield removeParentheses(comparison, fixer, context);
	}

	yield fixer.replaceText(operatorToken, replacementOperator);

	if (needsReturnOrThrowParentheses) {
		yield addParenthesesToReturnOrThrowExpression(fixer, parent, context);
		return;
	}

	const firstComparisonToken = sourceCode.getFirstToken(comparison);
	const tokenBefore = sourceCode.getTokenBefore(unaryExpression);
	if (needsSemicolon(tokenBefore, context, firstComparisonToken.value)) {
		yield fixer.insertTextBefore(unaryExpression, ';');
	}
}

const getFixedComparisonText = (comparison, context) => getBinaryExpressionWithReplacedOperatorText(
	comparison,
	context,
	negatedComparisonOperators.get(comparison.operator),
);

const getFixedLogicalExpressionText = (node, context, parentOperator) => {
	if (isComparison(node)) {
		return getFixedComparisonText(node, context);
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
	const needsReturnOrThrowParentheses = (
		(parent.type === 'ReturnStatement' || parent.type === 'ThrowStatement')
		&& parent.argument === unaryExpression
		&& !isOnSameLine(bangToken, tokenAfterBang, context)
		&& !isParenthesized(unaryExpression, context)
	);

	if (!needsReturnOrThrowParentheses) {
		yield fixSpaceAroundKeyword(fixer, unaryExpression, context);
	}

	yield fixer.remove(bangToken);
	yield fixer.replaceText(logicalExpression, getFixedLogicalExpressionText(logicalExpression, context));

	if (needsReturnOrThrowParentheses) {
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

		if (isComparison(argument)) {
			const comparison = argument;
			const replacementOperator = negatedComparisonOperators.get(comparison.operator);
			const problem = {
				node: unaryExpression,
				messageId: MESSAGE_ID_ERROR,
			};

			const fixFunction = fixer => fix({
				fixer,
				context,
				unaryExpression,
				comparison,
				replacementOperator,
			});

			if (negatedEqualityOperators.has(comparison.operator)) {
				problem.fix = fixFunction;
			} else {
				problem.suggest = [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						data: {
							operator: replacementOperator,
						},
						fix: fixFunction,
					},
				];
			}

			return problem;
		}

		if (
			!checkLogicalExpressions
			|| argument.type !== 'LogicalExpression'
			|| !isLogicalExpressionWithOnlyComparisons(argument)
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

		const fixFunction = fixer => fixLogical({
			fixer,
			context,
			unaryExpression,
			logicalExpression,
		});

		if (isSafelyFixableLogicalExpression(logicalExpression)) {
			problem.fix = fixFunction;
		} else {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_LOGICAL_SUGGESTION,
					fix: fixFunction,
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
		type: 'suggestion',
		docs: {
			description: 'Disallow negated comparisons.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [defaultOptions],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
