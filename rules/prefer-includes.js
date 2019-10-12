'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isMethodNamed = require('./utils/is-method-named');
const isLiteralValue = require('./utils/is-literal-value');

const message = 'Use `.includes()`, rather than `.indexOf()`, when checking for existence.';
// Ignore {_,lodash,underscore}.indexOf
const ignoredVariables = new Set(['_', 'lodash', 'underscore']);
const isIgnoredTarget = node => node.type === 'Identifier' && ignoredVariables.has(node.name);
const isNegativeOne = node => node.type === 'UnaryExpression' && node.operator === '-' && node.argument && node.argument.type === 'Literal' && node.argument.value === 1;
const isLiteralZero = node => isLiteralValue(node, 0);
const isNegativeResult = node => ['===', '==', '<'].includes(node.operator);

const report = (context, node, target, argumentsNodes) => {
	const sourceCode = context.getSourceCode();
	const memberExpressionNode = target.parent;
	const dotToken = sourceCode.getTokenBefore(memberExpressionNode.property);
	const targetSource = sourceCode.getText().slice(memberExpressionNode.range[0], dotToken.range[0]);

	// Strip default `fromIndex`
	if (isLiteralZero(argumentsNodes[1])) {
		argumentsNodes = argumentsNodes.slice(0, 1);
	}

	const argumentsSource = argumentsNodes.map(argument => sourceCode.getText(argument));

	context.report({
		node,
		message,
		fix: fixer => {
			const replacement = `${isNegativeResult(node) ? '!' : ''}${targetSource}.includes(${argumentsSource.join(', ')})`;
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

		if (
			(['!==', '!=', '>', '===', '=='].includes(node.operator) && isNegativeOne(right)) ||
			(['>=', '<'].includes(node.operator) && isLiteralZero(right))
		) {
			report(
				context,
				node,
				target,
				argumentsNodes
			);
		}
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	}
};
