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

function getCheckTypeAndLengthNode(node) {
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
		return {zeroLength: false, lengthNode: node.left};
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
		return {zeroLength: false, lengthNode: node.right};
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
		return {zeroLength: true, lengthNode: node.left};
	}

	if (
		// `0 === foo.length`
		isCompareLeft(node, '===', 0) ||
		// `0 == foo.length`
		isCompareLeft(node, '==', 0) ||
		// `1 > foo.length`
		isCompareLeft(node, '>', 1)
	) {
		return {zeroLength: true, lengthNode: node.right};
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

	function reportProblem(node, {zeroLength, lengthNode}, isNegative) {
		if (isNegative) {
			zeroLength = !zeroLength;
		}

		const {code, test} = zeroLength ? zeroStyle : nonZeroStyle;
		if (test(node)) {
			return;
		}

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
			messageId: zeroLength ? TYPE_ZERO : TYPE_NON_ZERO,
			data: {code},
			fix: fixer => fixer.replaceText(node, fixed)
		});
	}

	function checkBooleanNode(node, isNegative) {
		if (node.type === 'LogicalExpression') {
			checkBooleanNode(node.left);
			checkBooleanNode(node.right);
			return;
		}

		if (isLengthProperty(node)) {
			reportProblem(node, {zeroLength: false, lengthNode: node});
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
				reportProblem(node, {zeroLength: false, lengthNode: expression}, isNegative);
				return;
			}
		},
		[booleanNodeSelector](node) {
			checkBooleanNode(node);
		},
		BinaryExpression(node) {
			const result = getCheckTypeAndLengthNode(node);
			if (!result) {
				return;
			}

			let isNegative = false;
			while (isLogicNot(node.parent) && node.parent.argument === node) {
				isNegative = !isNegative;
				node = node.parent;
			}

			reportProblem(node, result, isNegative);
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
