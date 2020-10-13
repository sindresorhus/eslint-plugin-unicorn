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

const bitwiseOrAssignementExpressionSelector = [
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

const create = context => {
	const source = context.getSourceCode();
	return {
		[bitwiseOrBinaryExpressionSelector]: node => {
			let lhs = source.getText(node.left);
			if (node.left.type === 'SequenceExpression') {
				lhs = `(${lhs})`;
			}

			context.report({
				node,
				messageId: MESSAGE_ID_BITWISE_OR,
				fix: fixer => fixer.replaceText(node, `Math.trunc(${lhs})`)
			});
		},
		[bitwiseOrAssignementExpressionSelector]: node => {
			const lhs = source.getText(node.left);
			context.report({
				node,
				messageId: MESSAGE_ID_BITWISE_OR,
				fix: fixer => fixer.replaceText(node, `${lhs} = Math.trunc(${lhs})`)
			});
		},
		[bitwiseNoUnaryExpressionSelector]: node => {
			let raw = source.getText(node.argument);
			if (node.argument.type === 'SequenceExpression') {
				raw = `(${raw})`;
			}

			context.report({
				node: node.parent,
				messageId: MESSAGE_ID_BITWISE_NO,
				fix: fixer => fixer.replaceText(node.parent, `Math.trunc(${raw})`)
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
