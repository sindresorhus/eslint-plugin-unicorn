import {hasSideEffect} from '@eslint-community/eslint-utils';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {isCallExpression, isLiteral, isMethodCall} from './ast/index.js';
import {getCallExpressionArgumentsText, getCallExpressionTokens} from './utils/index.js';

const ERROR_BITWISE = 'error-bitwise';
const ERROR_BITWISE_NOT = 'error-bitwise-not';
const ERROR_PARSE_INT = 'error-parse-int';
const SUGGESTION_BITWISE = 'suggestion-bitwise';
const SUGGESTION_PARSE_INT = 'suggestion-parse-int';
const messages = {
	[ERROR_BITWISE]: 'Use `Math.trunc` instead of `{{operator}} {{value}}`.',
	[ERROR_BITWISE_NOT]: 'Use `Math.trunc` instead of `~~`.',
	[ERROR_PARSE_INT]: 'Use `Math.trunc` instead of `{{name}}(String(...), 10)`.',
	[SUGGESTION_BITWISE]: 'Replace `{{operator}} {{value}}` with `Math.trunc`.',
	[SUGGESTION_PARSE_INT]: 'Replace `{{name}}(String(...), 10)` with `Math.trunc`.',
};

// Bitwise operators
const bitwiseOperators = new Set(['|', '>>', '<<', '^']);
const isBitwiseNot = node =>
	node.type === 'UnaryExpression'
	&& node.operator === '~';

const getParseIntName = (node, sourceCode) => {
	if (
		isCallExpression(node, {
			name: 'parseInt',
			argumentsLength: 2,
			optional: false,
		})
		&& sourceCode.isGlobalReference(node.callee)
	) {
		return 'parseInt';
	}

	if (
		isMethodCall(node, {
			object: 'Number',
			method: 'parseInt',
			argumentsLength: 2,
			optionalCall: false,
			optionalMember: false,
			computed: false,
		})
		&& sourceCode.isGlobalReference(node.callee.object)
	) {
		return 'Number.parseInt';
	}
};

const isStringCall = (node, sourceCode) =>
	isCallExpression(node, {
		name: 'String',
		argumentsLength: 1,
		optional: false,
	})
	&& sourceCode.isGlobalReference(node.callee);

const hasCommentsOutsideStringArgument = (node, stringCall, context) => {
	const {sourceCode} = context;
	const {
		openingParenthesisToken,
		closingParenthesisToken,
	} = getCallExpressionTokens(stringCall, context);
	const stringArgumentRange = [
		sourceCode.getRange(openingParenthesisToken)[1],
		sourceCode.getRange(closingParenthesisToken)[0],
	];

	return sourceCode.getCommentsInside(node).some(comment => {
		const commentRange = sourceCode.getRange(comment);
		return commentRange[0] < stringArgumentRange[0] || commentRange[1] > stringArgumentRange[1];
	});
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	const mathTruncFunctionCall = node => {
		const text = sourceCode.getText(node);
		const parenthesized = node.type === 'SequenceExpression' ? `(${text})` : text;
		return `Math.trunc(${parenthesized})`;
	};

	const mathTruncFunctionCallFromStringArgument = node => {
		const argumentsText = getCallExpressionArgumentsText(context, node);
		return `Math.trunc(${argumentsText})`;
	};

	context.on('CallExpression', node => {
		const name = getParseIntName(node, sourceCode);
		if (!name) {
			return;
		}

		const [stringCall, radix] = node.arguments;
		if (
			!isStringCall(stringCall, sourceCode)
			|| !isLiteral(radix, 10)
		) {
			return;
		}

		const problem = {
			node,
			messageId: ERROR_PARSE_INT,
			data: {name},
		};

		if (!hasCommentsOutsideStringArgument(node, stringCall, context)) {
			problem.suggest = [
				{
					messageId: SUGGESTION_PARSE_INT,
					data: {name},
					fix: fixer => fixer.replaceText(node, mathTruncFunctionCallFromStringArgument(stringCall)),
				},
			];
		}

		return problem;
	});

	context.on(['BinaryExpression', 'AssignmentExpression'], node => {
		const {type, operator, right, left} = node;
		const isAssignment = type === 'AssignmentExpression';
		if (
			!isLiteral(right, 0)
			|| !bitwiseOperators.has(isAssignment ? operator.slice(0, -1) : operator)
		) {
			return;
		}

		const problem = {
			node,
			messageId: ERROR_BITWISE,
			data: {
				operator,
				value: right.raw,
			},
		};

		if (!isAssignment || !hasSideEffect(left, sourceCode)) {
			const fix = function * (fixer) {
				const fixed = mathTruncFunctionCall(left);
				if (isAssignment) {
					const operatorToken = sourceCode.getTokenAfter(left, token => token.type === 'Punctuator' && token.value === operator);
					yield fixer.replaceText(operatorToken, '=');
					yield fixer.replaceText(right, fixed);
				} else {
					yield fixSpaceAroundKeyword(fixer, node, context);
					yield fixer.replaceText(node, fixed);
				}
			};

			if (operator === '|') {
				problem.suggest = [
					{
						messageId: SUGGESTION_BITWISE,
						fix,
					},
				];
			} else {
				problem.fix = fix;
			}
		}

		return problem;
	});

	// Unary Expression Selector: Inner-most 2 bitwise NOT
	context.on('UnaryExpression', node => {
		if (
			isBitwiseNot(node)
			&& isBitwiseNot(node.argument)
			&& !isBitwiseNot(node.argument.argument)
		) {
			return {
				node,
				messageId: ERROR_BITWISE_NOT,
				* fix(fixer) {
					yield fixer.replaceText(node, mathTruncFunctionCall(node.argument.argument));
					yield fixSpaceAroundKeyword(fixer, node, context);
				},
			};
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Math.trunc()` for truncating numbers.',
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
