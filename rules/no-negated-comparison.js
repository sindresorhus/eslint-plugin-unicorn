import {
	removeParentheses,
	fixSpaceAroundKeyword,
	addParenthesizesToReturnOrThrowExpression,
} from './fix/index.js';
import {
	isParenthesized,
	isOnSameLine,
	needsSemicolon,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-negated-comparison/error';
const MESSAGE_ID_SUGGESTION = 'no-negated-comparison/suggestion';
const MESSAGE_ID_LOGICAL_SUGGESTION = 'no-negated-comparison/logical-suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer the opposite comparison instead of negating the whole comparison.',
	[MESSAGE_ID_SUGGESTION]: 'Switch to `{{operator}}`.',
	[MESSAGE_ID_LOGICAL_SUGGESTION]: 'Switch to opposite comparisons.',
};

const operatorReplacements = new Map([
	['===', '!=='],
	['!==', '==='],
	['==', '!='],
	['!=', '=='],
	['>', '<='],
	['>=', '<'],
	['<', '>='],
	['<=', '>'],
]);

const safelyFixableOperators = new Set([
	'===',
	'!==',
	'==',
	'!=',
]);

const logicalOperatorReplacements = new Map([
	['&&', '||'],
	['||', '&&'],
]);

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
	&& operatorReplacements.has(node.operator);

const isLogicalExpressionWithOnlyComparisons = node =>
	isComparison(node)
	|| (
		node.type === 'LogicalExpression'
		&& logicalOperatorReplacements.has(node.operator)
		&& isLogicalExpressionWithOnlyComparisons(node.left)
		&& isLogicalExpressionWithOnlyComparisons(node.right)
	);

const isNegatedComparison = node =>
	isNegation(node)
	&& isComparison(node.argument);

const isNegatedLogicalComparison = node =>
	isNegation(node)
	&& node.argument.type === 'LogicalExpression'
	&& isLogicalExpressionWithOnlyComparisons(node.argument);

const isSafelyFixableLogicalExpression = node =>
	isComparison(node)
		? safelyFixableOperators.has(node.operator)
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
	const operatorToken = sourceCode.getTokenAfter(
		comparison.left,
		token => token.type === 'Punctuator' && token.value === comparison.operator,
	);
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
		yield addParenthesizesToReturnOrThrowExpression(fixer, parent, context);
		return;
	}

	const firstComparisonToken = sourceCode.getFirstToken(comparison);
	const tokenBefore = sourceCode.getTokenBefore(unaryExpression);
	if (needsSemicolon(tokenBefore, context, firstComparisonToken.value)) {
		yield fixer.insertTextBefore(unaryExpression, ';');
	}
}

const fixedLogicalOperatorPrecedence = {
	'||': 1,
	'&&': 2,
};

const getOperatorToken = (comparison, sourceCode) => sourceCode.getTokenAfter(
	comparison.left,
	token => token.type === 'Punctuator' && token.value === comparison.operator,
);

const getFixedComparisonText = (comparison, sourceCode) => {
	const operatorToken = getOperatorToken(comparison, sourceCode);
	const [comparisonStart] = sourceCode.getRange(comparison);
	const [operatorStart, operatorEnd] = sourceCode.getRange(operatorToken);
	const comparisonText = sourceCode.getText(comparison);

	return [
		comparisonText.slice(0, operatorStart - comparisonStart),
		operatorReplacements.get(comparison.operator),
		comparisonText.slice(operatorEnd - comparisonStart),
	].join('');
};

const getFixedLogicalExpressionText = (node, context, parentOperator) => {
	const {sourceCode} = context;

	if (isComparison(node)) {
		return getFixedComparisonText(node, sourceCode);
	}

	const operator = logicalOperatorReplacements.get(node.operator);
	const text = [
		getFixedLogicalExpressionText(node.left, context, operator),
		operator,
		getFixedLogicalExpressionText(node.right, context, operator),
	].join(' ');

	return parentOperator && (
		(
			operator !== parentOperator
			&& isParenthesized(node, context)
		)
		|| fixedLogicalOperatorPrecedence[operator] < fixedLogicalOperatorPrecedence[parentOperator]
	)
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
		yield addParenthesizesToReturnOrThrowExpression(fixer, parent, context);
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
		if (isNegatedComparison(unaryExpression)) {
			const {argument: comparison} = unaryExpression;
			const replacementOperator = operatorReplacements.get(comparison.operator);
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

			if (safelyFixableOperators.has(comparison.operator)) {
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

		if (!checkLogicalExpressions || !isNegatedLogicalComparison(unaryExpression)) {
			return;
		}

		const {argument: logicalExpression} = unaryExpression;
		const problem = {
			node: unaryExpression,
			messageId: MESSAGE_ID_ERROR,
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
