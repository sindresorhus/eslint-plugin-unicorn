'use strict';
const getDocsUrl = require('./utils/get-docs-url');
const isMethodNamed = require('./utils/is-method-named');

const isNegativeOne = (operator, value) => operator === '-' && value === 1;

const report = (context, node, target, pattern) => {
	const sourceCode = context.getSourceCode();
	const memberExpressionNode = target.parent;
	const dotToken = sourceCode.getTokenBefore(memberExpressionNode.property);
	const targetSource = sourceCode.getText().slice(memberExpressionNode.range[0], dotToken.range[0]);
	const patternSource = sourceCode.getText(pattern);

	context.report({
		node,
		message: 'Use `.includes()`, rather than `.indexOf()`, when checking for existence.',
		fix: fixer => {
			const isNot = node => ['===', '==', '<'].includes(node.operator) ? '!' : '';
			const replacement = `${isNot(node)}${targetSource}.includes(${patternSource})`;
			return fixer.replaceText(node, replacement);
		}
	});
};

const create = context => ({
	BinaryExpression: node => {
		const {left, right} = node;

		if (isMethodNamed(left, 'indexOf')) {
			const target = left.callee.object;
			const pattern = left.arguments[0];

			if (right.type === 'UnaryExpression') {
				const {argument} = right;

				if (argument.type !== 'Literal') {
					return false;
				}

				const {value} = argument;

				if (['!==', '!=', '>', '===', '=='].includes(node.operator) && isNegativeOne(right.operator, value)) {
					report(context, node, target, pattern);
				}
			}

			if (right.type === 'Literal' && ['>=', '<'].includes(node.operator) && right.value === 0) {
				report(context, node, target, pattern);
			}

			return false;
		}
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
