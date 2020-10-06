'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'prefer-math-trunc';
const messages = {
	[MESSAGE_ID]: 'Use `Math.trunc` instead of `| 0`.'
};

const binaryExpressionSelector = [
	'BinaryExpression',
	'[operator="|"]',
	'[right.type="Literal"]',
	'[right.raw=0]'
].join('');

const assignementExpressionSelector = [
	'AssignmentExpression',
	'[operator="|="]',
	'[right.type="Literal"]',
	'[right.raw=0]'
].join('');

const create = context => {
	const source = context.getSourceCode();
	return {
		[binaryExpressionSelector]: node => {
			const lhs = source.getText(node.left);
			context.report({
				node,
				messageId: MESSAGE_ID,
				fix: fixer => fixer.replaceText(node, `Math.trunc(${lhs})`)
			});
		},
		[assignementExpressionSelector]: node => {
			const lhs = source.getText(node.left);
			context.report({
				node,
				messageId: MESSAGE_ID,
				fix: fixer => fixer.replaceText(node, `${lhs} = Math.trunc(${lhs})`)
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
