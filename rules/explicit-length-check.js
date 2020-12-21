'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const messages = {
	'non-zero': 'Use `.length {{code}}` when checking length is not zero.',
	zero: 'Use `.length {{code}}` when checking length is zero.'
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

function getNonZeroLengthNode(node) {
	// `foo.length`
	if (isLengthProperty(node)) {
		return node;
	}

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
		return node.left;
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
		return node.right;
	}
}

function getZeroLengthNode(node) {
	if (
		// `foo.length === 0`
		isCompareRight(node, '===', 0) ||
		// `foo.length == 0`
		isCompareRight(node, '==', 0) ||
		// `foo.length < 1`
		isCompareRight(node, '<', 1)
	) {
		return node.left;
	}

	if (
		// `0 === foo.length`
		isCompareLeft(node, '===', 0) ||
		// `0 == foo.length`
		isCompareLeft(node, '==', 0) ||
		// `1 > foo.length`
		isCompareLeft(node, '>', 1)
	) {
		return node.right;
	}
}

const selector = `:matches(${
	[
		'IfStatement',
		'ConditionalExpression',
		'WhileStatement',
		'DoWhileStatement',
		'ForStatement'
	].join(', ')
}) > *.test`;

const create = context => {
	const options = {
		'non-zero': 'greater-than',
		...context.options[0]
	};
	const nonZeroStyle = nonZeroStyles.get(options['non-zero']);
	const sourceCode = context.getSourceCode();

	function checkExpression(node) {
		// Is matched style
		if (nonZeroStyle.test(node) || zeroStyle.test(node)) {
			return;
		}

		let isNegative = false;
		let expression = node;
		while (isLogicNot(expression)) {
			isNegative = !isNegative;
			expression = expression.argument;
		}

		if (expression.type === 'LogicalExpression') {
			checkExpression(expression.left);
			checkExpression(expression.right);
			return;
		}

		let lengthNode;
		let isCheckingZero = isNegative;

		const zeroLengthNode = getZeroLengthNode(expression);
		if (zeroLengthNode) {
			lengthNode = zeroLengthNode;
			isCheckingZero = !isCheckingZero;
		} else {
			const nonZeroLengthNode = getNonZeroLengthNode(expression);
			if (nonZeroLengthNode) {
				lengthNode = nonZeroLengthNode;
			} else {
				return;
			}
		}

		const {code} = isCheckingZero ? zeroStyle : nonZeroStyle;
		const messageId = isCheckingZero ? 'zero' : 'non-zero';
		context.report({
			node,
			messageId,
			data: {code},
			fix: fixer => fixer.replaceText(node, `${sourceCode.getText(lengthNode)} ${code}`)
		});
	}

	return {
		[selector](node) {
			checkExpression(node);
		}
	};
};

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
