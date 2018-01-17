'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const isIndexOfCallExpression = node => {
	if (node.type !== 'CallExpression') {
		return false;
	}

	const property = node.callee.property;

	return property.name === 'indexOf';
};

const isUnaryNotExpression = node => (
	node.type === 'UnaryExpression' && node.operator === '!'
);

const isNegativeOne = (operator, value) => operator === '-' && value === 1;

const getSourceCode = (context, node) => (
	// Context.getSourceCode().text.slice(node.range[0], node.range[1])
	context.getSourceCode().getText(node)
);

const report = (context, node, target, pattern) => {
	const targetSource = getSourceCode(context, target);
	const patternSource = getSourceCode(context, pattern);
	context.report({
		node,
		message: 'Use .includes(), rather than .indexOf(), when checking for existence.',
		fix: fixer => fixer.replaceText(node, `${targetSource}.includes(${patternSource})`)
	});
};

const create = context => ({
	BinaryExpression: node => {
		const left = node.left;
		const right = node.right;

		if (isIndexOfCallExpression(left)) {
			const target = left.callee.object;
			const pattern = left.arguments[0];

			if (right.type === 'UnaryExpression') {
				const argument = right.argument;

				if (argument.type !== 'Literal') {
					return false;
				}

				const value = argument.value;

				if (['!==', '!=', '>'].indexOf(node.operator) !== -1 && isNegativeOne(right.operator, value)) {
					report(context, node, target, pattern);
				}
			}

			if (right.type !== 'Literal') {
				return false;
			}

			if (right.type === 'Literal' && node.operator === '>=' && right.value === 0) {
				report(context, node, target, pattern);
			}
			return;
		}

		if (isUnaryNotExpression(left)) {
			const argument = left.argument;

			if (isIndexOfCallExpression(argument)) {
				const target = argument.callee.object;
				const pattern = argument.arguments[0];

				if (right.type === 'UnaryExpression') {
					const argument = right.argument;

					if (argument.type !== 'Literal') {
						return false;
					}

					const value = argument.value;

					if (node.operator === '===' && isNegativeOne(right.operator, value)) {
						report(context, node, target, pattern);
					}
					if (node.operator === '==' && isNegativeOne(right.operator, value)) {
						report(context, node, target, pattern);
					}
				}

				if (right.type !== 'Literal') {
					return false;
				}

				if (node.operator === '<' && right.value === 0) {
					report(context, node, target, pattern);
				}

				return false;
			}
		}
	}
});

module.exports = {
	create,
	meta: {
		docs: {
			url: getDocsUrl()
		},
		fixable: 'code'
	}
};
