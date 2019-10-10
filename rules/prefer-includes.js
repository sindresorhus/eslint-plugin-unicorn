'use strict';
const getDocsUrl = require('./utils/get-docs-url');
const isMethodNamed = require('./utils/is-method-named');

// Ignore {_,lodash,underscore}.indexOf
const ignoredVariables = new Set(['_', 'lodash', 'underscore']);
const isNegativeOne = (operator, value) => operator === '-' && value === 1;
const isIgnoredTarget = node => node.type === 'Identifier' && ignoredVariables.has(node.name);

const report = (context, node, target, argumentsNodes) => {
	const sourceCode = context.getSourceCode();
	const memberExpressionNode = target.parent;
	const dotToken = sourceCode.getTokenBefore(memberExpressionNode.property);
	const targetSource = sourceCode.getText().slice(memberExpressionNode.range[0], dotToken.range[0]);

	// Strip default `fromIndex`
	if (argumentsNodes.length === 2 && argumentsNodes[1].type === 'Literal' && argumentsNodes[1].value === 0) {
		argumentsNodes = argumentsNodes.slice(0, 1);
	}

	const argumentsSource = argumentsNodes.map(argument => sourceCode.getText(argument));

	context.report({
		node,
		message: 'Use `.includes()`, rather than `.indexOf()`, when checking for existence.',
		fix: fixer => {
			const isNot = node => ['===', '==', '<'].includes(node.operator) ? '!' : '';
			const replacement = `${isNot(node)}${targetSource}.includes(${argumentsSource.join(', ')})`;
			return fixer.replaceText(node, replacement);
		}
	});
};

const create = context => ({
	BinaryExpression: node => {
		const {left, right} = node;

		if (!isMethodNamed(left, 'indexOf')) {
			return;
		}

		const target = left.callee.object;

		if (isIgnoredTarget(target)) {
			return;
		}

		const {arguments: argumentsNodes} = left;

		// Ignore something.indexOf(foo, 0, another)
		if (argumentsNodes.length > 2) {
			return;
		}

		if (right.type === 'UnaryExpression') {
			const {argument} = right;

			if (argument.type !== 'Literal') {
				return;
			}

			const {value} = argument;

			if (['!==', '!=', '>', '===', '=='].includes(node.operator) && isNegativeOne(right.operator, value)) {
				report(context, node, target, argumentsNodes);
			}
		}

		if (right.type === 'Literal' && ['>=', '<'].includes(node.operator) && right.value === 0) {
			report(context, node, target, argumentsNodes);
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
