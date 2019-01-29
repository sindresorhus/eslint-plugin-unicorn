'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const isIndexOfCallExpression = node => {
	if (node.type !== 'CallExpression') {
		return false;
	}

	const {property} = node.callee;

	return property.name === 'indexOf';
};

const isNegativeOne = (operator, value) => operator === '-' && value === 1;

const getSourceCode = (context, node) => (
	context.getSourceCode().getText(node)
);

const report = (context, node, target, pattern) => {
	const targetSource = getSourceCode(context, target);
	const patternSource = getSourceCode(context, pattern);
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
		const {left} = node;
		const {right} = node;

		if (isIndexOfCallExpression(left)) {
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

			if (right.type !== 'Literal') {
				return false;
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
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
