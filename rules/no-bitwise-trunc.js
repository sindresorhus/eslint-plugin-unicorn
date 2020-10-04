'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'no-bitwise-trunc';
const messages = {
	[MESSAGE_ID]: 'Use `Math.trunc` instead of `| 0`.'
};

const binaryExpressionSelector = [
	'BinaryExpression',
	'[operator="|"]',
	'[left.type=/(Literal|Identifier)/]',
	'[right.type="Literal"]',
	'[right.value=0]'
].join('');

const assignementExpressionSelector = [
	'AssignmentExpression',
	'[operator="|="]',
	'[left.type=/(Literal|Identifier)/]',
	'[right.type="Literal"]',
	'[right.value=0]'
].join('');

const create = context => {
	return {
		[binaryExpressionSelector]: node => {
			context.report({
				node,
				messageId: MESSAGE_ID,
				fix: fixer => fixer.replaceText(node, `Math.trunc(${node.left.value || node.left.name})`)
			});
		},
		[assignementExpressionSelector]: node => {
			context.report({
				node,
				messageId: MESSAGE_ID,
				fix: fixer => fixer.replaceText(node, `${node.left.name} = Math.trunc(${node.left.name})`)
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
