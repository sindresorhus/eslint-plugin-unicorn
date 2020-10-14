'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID_BITWISE_OR = 'bitwiseOr';
const MESSAGE_ID_BITWISE_NO = 'bitwiseNo';
const messages = {
	[MESSAGE_ID_BITWISE_OR]: 'Use `Math.trunc` instead of `| 0`.',
	[MESSAGE_ID_BITWISE_NO]: 'Use `Math.trunc` instead of `~~`.'
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

// 2 bitwise NO
const bitwiseNoUnaryExpressionSelector = [
	'UnaryExpression[operator="~"]',
	'>',
	'UnaryExpression[operator="~"]'
].join('');

const isBitWiseNoUnaryExpression = ({type, operator}) => type === 'UnaryExpression' && operator === '~';


const create = context => {
	const source = context.getSourceCode();
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
			const lhs = source.getText(node.left);
			context.report({
				node,
				messageId: MESSAGE_ID_BITWISE_OR,
				fix: fixer => fixer.replaceText(node, `${lhs} = Math.trunc(${lhs})`)
			});
		},
		[bitwiseNoUnaryExpressionSelector]: node => {
			if (isBitWiseNoUnaryExpression(node.argument)) {
				return;
			}

			context.report({
				node: node.parent,
				messageId: MESSAGE_ID_BITWISE_NO,
				fix: fixer => fixer.replaceText(node.parent, `Math.trunc(${getParenthesizedText(node.argument)})`)
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
