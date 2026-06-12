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
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer the opposite comparison instead of negating the whole comparison.',
	[MESSAGE_ID_SUGGESTION]: 'Switch to `{{operator}}`.',
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

const isNegatedComparison = node =>
	node.type === 'UnaryExpression'
	&& node.operator === '!'
	&& node.prefix
	&& !(
		node.parent.type === 'UnaryExpression'
		&& node.parent.operator === '!'
		&& node.parent.argument === node
	)
	&& node.argument.type === 'BinaryExpression'
	&& operatorReplacements.has(node.argument.operator);

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
		parentNeedsGroupedComparison(unaryExpression.parent)
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

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('UnaryExpression', unaryExpression => {
		if (!isNegatedComparison(unaryExpression)) {
			return;
		}

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
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
