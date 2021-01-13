'use strict';
const {hasSideEffect} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID_BITWISE = 'bitwise';
const MESSAGE_ID_BITWISE_NOT = 'bitwiseNot';
const SUGGESTION_MESSAGE_ID = 'suggestion';
const messages = {
	[MESSAGE_ID_BITWISE]: 'Use `Math.trunc` instead of `{{operator}} {{value}}`.',
	[MESSAGE_ID_BITWISE_NOT]: 'Use `Math.trunc` instead of `~~`.',
	[SUGGESTION_MESSAGE_ID]: 'Replace `| 0` with `Math.trunc`.'
};

const createBitwiseNotSelector = (level, isNegative) => {
	const prefix = 'argument.'.repeat(level);
	const selector = [
		`[${prefix}type="UnaryExpression"]`,
		`[${prefix}operator="~"]`
	].join('');
	return isNegative ? `:not(${selector})` : selector;
};

// Bitwise operators
const bitwiseOperators = new Set(['|', '>>', '<<', '^']);
// Unary Expression Selector: Inner-most 2 bitwise NOT
const bitwiseNotUnaryExpressionSelector = [
	createBitwiseNotSelector(0),
	createBitwiseNotSelector(1),
	createBitwiseNotSelector(2, true)
].join('');

const create = context => {
	const sourceCode = context.getSourceCode();

	const mathTruncFunctionCall = node => {
		const text = sourceCode.getText(node);
		const parenthesized = node.type === 'SequenceExpression' ? `(${text})` : text;
		return `Math.trunc(${parenthesized})`;
	};

	return {
		':matches(BinaryExpression, AssignmentExpression)[right.type="Literal"]': node => {
			const {type, operator, right, left} = node;
			const isAssignment = type === 'AssignmentExpression';
			if (
				right.value !== 0 ||
				!bitwiseOperators.has(isAssignment ? operator.slice(0, -1) : operator)
			) {
				return;
			}

			const problem = {
				node,
				messageId: MESSAGE_ID_BITWISE,
				data: {
					operator,
					value: right.raw
				}
			};

			if (!isAssignment || !hasSideEffect(left, sourceCode)) {
				const fix = fixer => {
					let fixed = mathTruncFunctionCall(left);
					if (isAssignment) {
						fixed = `${sourceCode.getText(left)} = ${fixed}`;
					}

					return fixer.replaceText(node, fixed);
				};

				if (operator === '|') {
					problem.suggest = [
						{
							messageId: SUGGESTION_MESSAGE_ID,
							fix
						}
					];
				} else {
					problem.fix = fix;
				}
			}

			context.report(problem);
		},
		[bitwiseNotUnaryExpressionSelector]: node => {
			context.report({
				node,
				messageId: MESSAGE_ID_BITWISE_NOT,
				fix: fixer => fixer.replaceText(node, mathTruncFunctionCall(node.argument.argument))
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		messages,
		fixable: 'code'
	}
};
