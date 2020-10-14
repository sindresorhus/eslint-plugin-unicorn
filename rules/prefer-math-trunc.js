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

// 2 bitwise NOT
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
	const getParenthesizedText = node => {
		const text = sourceCode.getText(node);
		return node.type === 'SequenceExpression' ? `(${text})` : text;
	};

	return {
		[bitwiseOrBinaryExpressionSelector]: node => {
			context.report({
				node,
				messageId: MESSAGE_ID_BITWISE_OR,
				fix: fixer => fixer.replaceText(node, `Math.trunc(${getParenthesizedText(node.left)})`)
			});
		},
		[bitwiseOrAssignmentExpressionSelector]: node => {
			const leftHandSide = sourceCode.getText(node.left);
			context.report({
				node,
				messageId: MESSAGE_ID_BITWISE_OR,
				fix: fixer => fixer.replaceText(node, `${leftHandSide} = Math.trunc(${leftHandSide})`)
			});
		},
		[bitwiseNotUnaryExpressionSelector]: node => {
			context.report({
				node: node,
				messageId: MESSAGE_ID_BITWISE_NOT,
				fix: fixer => fixer.replaceText(node, `Math.trunc(${getParenthesizedText(node.argument.argument)})`)
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
