import {fixSpaceAroundKeyword, addParenthesesToReturnOrThrowExpression} from './fix/index.js';
import {
	needsSemicolon,
	isOnSameLine,
	isParenthesized,
	getUnparenthesizedKeywordArgumentParent,
	shouldAddParenthesesToExpressionStart,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-negation-in-equality-check/error';
const MESSAGE_ID_SUGGESTION = 'no-negation-in-equality-check/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Negated expression is not allowed in equality check.',
	[MESSAGE_ID_SUGGESTION]: 'Switch to \'{{operator}}\' check.',
};

const EQUALITY_OPERATORS = new Set([
	'===',
	'!==',
	'==',
	'!=',
]);

const isEqualityCheck = node => node.type === 'BinaryExpression' && EQUALITY_OPERATORS.has(node.operator);
const isNegatedExpression = node => node.type === 'UnaryExpression' && node.prefix && node.operator === '!';

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('BinaryExpression', binaryExpression => {
		const {operator, left} = binaryExpression;

		if (!(isEqualityCheck(binaryExpression)
			&& isNegatedExpression(left)) || isNegatedExpression(left.argument)) {
			return;
		}

		const {sourceCode} = context;
		const bangToken = sourceCode.getFirstToken(left);
		const keywordParent = getUnparenthesizedKeywordArgumentParent(left, context);
		const needsParentheses = !isParenthesized(left.argument, context)
			&& shouldAddParenthesesToExpressionStart(left.argument, context, left);
		const negatedOperator = `${operator.startsWith('!') ? '=' : '!'}${operator.slice(1)}`;
		const problem = {
			node: bangToken,
			messageId: MESSAGE_ID_ERROR,
		};
		if (
			keywordParent?.type === 'YieldExpression'
			&& !isOnSameLine(bangToken, sourceCode.getTokenAfter(bangToken), context)
		) {
			return problem;
		}

		return {
			...problem,
			/**
			@param {import('eslint').Rule.RuleFixer} fixer
			*/
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data: {
						operator: negatedOperator,
					},
					/**
					@param {import('eslint').Rule.RuleFixer} fixer
					*/
					* fix(fixer) {
						yield fixSpaceAroundKeyword(fixer, binaryExpression, context);

						const tokenAfterBang = sourceCode.getTokenAfter(bangToken);

						if (
							keywordParent?.type === 'ReturnStatement'
							|| keywordParent?.type === 'ThrowStatement'
						) {
							const returnToken = sourceCode.getFirstToken(keywordParent);
							if (!isOnSameLine(returnToken, tokenAfterBang, context)) {
								yield addParenthesesToReturnOrThrowExpression(fixer, keywordParent, context);
							}
						}

						yield fixer.remove(bangToken);

						if (needsParentheses) {
							yield fixer.insertTextBefore(left.argument, '(');
							yield fixer.insertTextAfter(left.argument, ')');
						}

						const previousToken = sourceCode.getTokenBefore(bangToken);
						if (needsSemicolon(previousToken, context, needsParentheses ? '(' : tokenAfterBang.value)) {
							yield fixer.insertTextBefore(bangToken, ';');
						}

						const operatorToken = sourceCode.getTokenAfter(
							left,
							token => token.type === 'Punctuator' && token.value === operator,
						);
						yield fixer.replaceText(operatorToken, negatedOperator);
					},
				},
			],
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow negated expression in equality check.',
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
