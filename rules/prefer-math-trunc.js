'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID_BITWISE_OR = 'bitwiseOr';
const MESSAGE_ID_BITWISE_NOT = 'bitwiseNot';
const messages = {
	[MESSAGE_ID_BITWISE_OR]: 'Use `Math.trunc` instead of `| 0`.',
	[MESSAGE_ID_BITWISE_NOT]: 'Use `Math.trunc` instead of `~~`.'
};

// Bitwise OR with 0
const bitwiseOrBinaryExpressionSelector = [
	'BinaryExpression',
	'[operator="|"]',
	'[right.type="Literal"]',
	'[right.raw=0]'
].join('');

const bitwiseOrAssignmentExpressionSelector = [
	'AssignmentExpression',
	'[operator="|="]',
	'[right.type="Literal"]',
	'[right.raw=0]'
].join('');

// Inner-most 2 bitwise NOT
const createBitwiseNotSelector = (level, isNegative) => {
	const prefix = 'argument.'.repeat(level);
	const selector = [
		`[${prefix}type="UnaryExpression"]`,
		`[${prefix}operator="~"]`
	].join('');
	return isNegative ? `:not(${selector})` : selector;
};

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
		[bitwiseOrBinaryExpressionSelector]: node => {
			context.report({
				node,
				messageId: MESSAGE_ID_BITWISE_OR,
				fix: fixer => fixer.replaceText(node, mathTruncFunctionCall(node.left))
			});
		},
		[bitwiseOrAssignmentExpressionSelector]: node => {
			context.report({
				node,
				messageId: MESSAGE_ID_BITWISE_OR,
				fix: fixer => fixer.replaceText(node, `${sourceCode.getText(node.left)} = ${mathTruncFunctionCall(node.left)}`)
			});
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
