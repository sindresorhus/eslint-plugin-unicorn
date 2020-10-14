'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID_BITWISE_OR = 'bitwiseOr';
const MESSAGE_ID_BITWISE_NOT = 'bitwiseNot';
const MESSAGE_ID_BITWISE_SIGNED_RIGHT_SHIFT = 'bitwiseSignedRightShift';
const MESSAGE_ID_BITWISE_LEFT_SHIFT = 'bitwiseLeftShift';
const MESSAGE_ID_BITWISE_XOR = 'bitwiseXor';
const MESSAGE_ID_BITWISE_AND = 'bitwiseAnd';
const messages = {
	[MESSAGE_ID_BITWISE_OR]: 'Use `Math.trunc` instead of `| 0`.',
	[MESSAGE_ID_BITWISE_NOT]: 'Use `Math.trunc` instead of `~~`.',
	[MESSAGE_ID_BITWISE_SIGNED_RIGHT_SHIFT]: 'Use `Math.trunc` instead of `>> 0`.',
	[MESSAGE_ID_BITWISE_LEFT_SHIFT]: 'Use `Math.trunc` instead of `<< 0`.',
	[MESSAGE_ID_BITWISE_XOR]: 'Use `Math.trunc` instead of `^ 0`.',
	[MESSAGE_ID_BITWISE_AND]: 'Use `Math.trunc` instead of `& 0xF`.'
};

const createBinaryExpression = (operator, raw = 0) => [
	'BinaryExpression',
	`[operator="${operator}"]`,
	'[right.type="Literal"]',
	`[right.raw=${raw}]`
].join('');

const createAssignmentExpression = (operator, raw = 0) => [
	'AssignmentExpression',
	`[operator="${operator}="]`,
	'[right.type="Literal"]',
	`[right.raw=${raw}]`
].join('');

const createBitwiseNotSelector = (level, isNegative) => {
	const prefix = 'argument.'.repeat(level);
	const selector = [
		`[${prefix}type="UnaryExpression"]`,
		`[${prefix}operator="~"]`
	].join('');
	return isNegative ? `:not(${selector})` : selector;
};

// All binary expressions
const binarySelectors = [
	[MESSAGE_ID_BITWISE_OR, createBinaryExpression('|')],
	[MESSAGE_ID_BITWISE_SIGNED_RIGHT_SHIFT, createBinaryExpression('>>')],
	[MESSAGE_ID_BITWISE_LEFT_SHIFT, createBinaryExpression('<<')],
	[MESSAGE_ID_BITWISE_XOR, createBinaryExpression('^')],
	[MESSAGE_ID_BITWISE_AND, createBinaryExpression('&', /^(0xF{0,13})$/)]
];
// All assignment expressions
const assignmentSelectors = [
	[MESSAGE_ID_BITWISE_OR, createAssignmentExpression('|')],
	[MESSAGE_ID_BITWISE_SIGNED_RIGHT_SHIFT, createAssignmentExpression('>>')],
	[MESSAGE_ID_BITWISE_LEFT_SHIFT, createAssignmentExpression('<<')],
	[MESSAGE_ID_BITWISE_XOR, createAssignmentExpression('^')],
	[MESSAGE_ID_BITWISE_AND, createAssignmentExpression('&', /^(0xF{0,13})$/)]
];
// Unary Expression: Inner-most 2 bitwise NOT
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

	const selectors = {
		[bitwiseNotUnaryExpressionSelector]: node => {
			context.report({
				node,
				messageId: MESSAGE_ID_BITWISE_NOT,
				fix: fixer => fixer.replaceText(node, mathTruncFunctionCall(node.argument.argument))
			});
		}
	};

	for (const [messageId, selector] of binarySelectors) {
		selectors[selector] = node => context.report({
			node,
			messageId,
			fix: fixer => fixer.replaceText(node, mathTruncFunctionCall(node.left))
		});
	}

	for (const [messageId, selector] of assignmentSelectors) {
		selectors[selector] = node => context.report({
			node,
			messageId,
			fix: fixer => fixer.replaceText(node, `${sourceCode.getText(node.left)} = ${mathTruncFunctionCall(node.left)}`)
		});
	}

	return selectors;
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
