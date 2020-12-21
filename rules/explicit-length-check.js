'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');

const TYPE_NON_ZERO = 'non-zero';
const TYPE_ZERO = 'zero';
const messages = {
	[TYPE_NON_ZERO]: 'Use `.length {{code}}` when checking length is not zero.',
	[TYPE_ZERO]: 'Use `.length {{code}}` when checking length is zero.'
};

const isLengthProperty = node =>
	node.type === 'MemberExpression' &&
	node.computed === false &&
	node.property.type === 'Identifier' &&
	node.property.name === 'length';
const isLogicNot = node =>
	node.type === 'UnaryExpression' &&
	node.operator === '!';
const isLiteralNumber = (node, value) =>
	node.type === 'Literal' &&
	typeof node.value === 'number' &&
	node.value === value;
const isCompareRight = (node, operator, value) =>
	node.type === 'BinaryExpression' &&
	node.operator === operator &&
	isLengthProperty(node.left) &&
	isLiteralNumber(node.right, value);
const isCompareLeft = (node, operator, value) =>
	node.type === 'BinaryExpression' &&
	node.operator === operator &&
	isLengthProperty(node.right) &&
	isLiteralNumber(node.left, value);
const nonZeroStyles = new Map([
	[
		'greater-than',
		{
			code: '> 0',
			test: node => isCompareRight(node, '>', 0)
		}
	],
	[
		'not-equal',
		{
			code: '!== 0',
			test: node => isCompareRight(node, '!==', 0)
		}
	],
	[
		'greater-than-or-equal',
		{
			code: '>= 1',
			test: node => isCompareRight(node, '>=', 1)
		}
	]
]);
const zeroStyle = {
	code: '=== 0',
	test: node => isCompareRight(node, '===', 0)
};

const cache = new WeakMap();
function getCheckTypeAndLengthNode(node) {
	if (!cache.has(node)) {
		cache.set(node, getCheckTypeAndLengthNodeWithoutCache(node));
	}

	return cache.get(node);
}

function getCheckTypeAndLengthNodeWithoutCache(node) {
	// Non-Zero length check
	if (
		// `foo.length !== 0`
		isCompareRight(node, '!==', 0) ||
		// `foo.length != 0`
		isCompareRight(node, '!=', 0) ||
		// `foo.length > 0`
		isCompareRight(node, '>', 0) ||
		// `foo.length >= 1`
		isCompareRight(node, '>=', 1)
	) {
		return {type: TYPE_NON_ZERO, node, lengthNode: node.left};
	}

	if (
		// `0 !== foo.length`
		isCompareLeft(node, '!==', 0) ||
		// `0 !== foo.length`
		isCompareLeft(node, '!=', 0) ||
		// `0 < foo.length`
		isCompareLeft(node, '<', 0) ||
		// `1 <= foo.length`
		isCompareLeft(node, '<=', 1)
	) {
		return {type: TYPE_NON_ZERO, node, lengthNode: node.right};
	}

	// Zero length check
	if (
		// `foo.length === 0`
		isCompareRight(node, '===', 0) ||
		// `foo.length == 0`
		isCompareRight(node, '==', 0) ||
		// `foo.length < 1`
		isCompareRight(node, '<', 1)
	) {
		return {type: TYPE_ZERO, node, lengthNode: node.left};
	}

	if (
		// `0 === foo.length`
		isCompareLeft(node, '===', 0) ||
		// `0 == foo.length`
		isCompareLeft(node, '==', 0) ||
		// `1 > foo.length`
		isCompareLeft(node, '>', 1)
	) {
		return {type: TYPE_ZERO, node, lengthNode: node.right};
	}
}

// TODO: check other `LogicalExpression`s
const booleanNodeSelector = `:matches(${
	[
		'IfStatement',
		'ConditionalExpression',
		'WhileStatement',
		'DoWhileStatement',
		'ForStatement'
	].join(', ')
}) > *.test`;

function create(context) {
	const options = {
		'non-zero': 'greater-than',
		...context.options[0]
	};
	const nonZeroStyle = nonZeroStyles.get(options['non-zero']);
	const sourceCode = context.getSourceCode();
	const reportedBinaryExpressions = new Set();

	function reportProblem({node, type, lengthNode}, isNegative) {
		if (isNegative) {
			type = type === TYPE_NON_ZERO ? TYPE_ZERO : TYPE_NON_ZERO;
		}

		const {code} = type === TYPE_NON_ZERO ? nonZeroStyle : zeroStyle;
		let fixed = `${sourceCode.getText(lengthNode)} ${code}`;
		if (
			!isParenthesized(node, sourceCode) &&
			node.type === 'UnaryExpression' &&
			node.parent.type === 'UnaryExpression'
		) {
			fixed = `(${fixed})`;
		}

		context.report({
			node,
			messageId: type,
			data: {code},
			fix: fixer => fixer.replaceText(node, fixed)
		});
	}

	function checkBooleanNode(node) {
		if (node.type === 'LogicalExpression') {
			checkBooleanNode(node.left);
			checkBooleanNode(node.right);
			return;
		}

		if (isLengthProperty(node)) {
			reportProblem({node, type: TYPE_NON_ZERO, lengthNode: node});
		}
	}

	const binaryExpressions = [];
	return {
		// The outer `!` expression
		'UnaryExpression[operator="!"]:not(UnaryExpression[operator="!"] > .argument)'(node) {
			let isNegative = false;
			let expression = node;
			while (isLogicNot(expression)) {
				isNegative = !isNegative;
				expression = expression.argument;
			}

			if (expression.type === 'LogicalExpression') {
				checkBooleanNode(expression);
				return;
			}

			if (isLengthProperty(expression)) {
				reportProblem({type: TYPE_NON_ZERO, node, lengthNode: expression}, isNegative);
				return;
			}

			const result = getCheckTypeAndLengthNode(expression);
			if (result) {
				reportProblem({...result, node}, isNegative);
				reportedBinaryExpressions.add(result.lengthNode);
			}
		},
		[booleanNodeSelector](node) {
			checkBooleanNode(node);
		},
		BinaryExpression(node) {
			// Delay check on this, so we don't need take two steps for this case
			// `const isEmpty = !(foo.length >= 1);`
			binaryExpressions.push(node);
		},
		'Program:exit'() {
			for (const node of binaryExpressions) {
				if (
					reportedBinaryExpressions.has(node) ||
					zeroStyle.test(node) ||
					nonZeroStyle.test(node)
				) {
					continue;
				}

				const result = getCheckTypeAndLengthNode(node);
				if (result) {
					reportProblem(result);
				}
			}
		}
	};
}

const schema = [
	{
		type: 'object',
		properties: {
			'non-zero': {
				enum: [...nonZeroStyles.keys()],
				default: 'greater-than'
			}
		}
	}
];

module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
