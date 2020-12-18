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
const isRightSide = (node, operator, value) =>
	node.type === 'BinaryExpression' &&
	node.operator === operator &&
	isLengthProperty(node.left) &&
	isLiteralNumber(node.right, value);
const isLeftSide = (node, operator, value) =>
	node.type === 'BinaryExpression' &&
	node.operator === operator &&
	isLengthProperty(node.right) &&
	isLiteralNumber(node.left, value);
const nonZeroStyles = new Map([
	[
		'greater-than',
		{
			code: '> 0',
			test: node => isRightSide(node, '>', 0)
		}
	],
	[
		'not-equal',
		{
			code: '!== 0',
			test: node => isRightSide(node, '!==', 0)
		}
	],
	[
		'greater-than-or-equal',
		{
			code: '>= 1',
			test: node => isRightSide(node, '>=', 1)
		}
	]
]);
const zeroStyle = {
	code: '=== 0',
	test: node => isRightSide(node, '===', 0)
};

function getNonZeroLengthNode(node) {
	// `foo.length`
	if (isLengthProperty(node)) {
		return node;
	}

	// `!!foo.length`
	if (
		isLogicNot(node) &&
		isLogicNot(node.argument) &&
		isLengthProperty(node.argument.argument)
	) {
		return node.argument.argument;
	}

	if (
		// `foo.length !== 0`
		isRightSide(node, '!==', 0) ||
		// `foo.length != 0`
		isRightSide(node, '!=', 0) ||
		// `foo.length > 0`
		isRightSide(node, '>', 0) ||
		// `foo.length >= 1`
		isRightSide(node, '>=', 1)
	) {
		return node.left;
	}

	if (
		// `0 !== foo.length`
		isLeftSide(node, '!==', 0) ||
		// `0 !== foo.length`
		isLeftSide(node, '!=', 0) ||
		// `0 < foo.length`
		isLeftSide(node, '<', 0) ||
		// `1 <= foo.length`
		isLeftSide(node, '<=', 1)
	) {
		return node.right;
	}
}

function getZeroLengthNode(node) {
	// `!foo.length`
	if (
		isLogicNot(node) &&
		isLengthProperty(node.argument)
	) {
		return node.argument;
	}

	if (
		// `foo.length === 0`
		isRightSide(node, '===', 0) ||
		// `foo.length == 0`
		isRightSide(node, '==', 0) ||
		// `foo.length < 1`
		isRightSide(node, '<', 1)
	) {
		return node.left;
	}

	if (
		// `0 === foo.length`
		isLeftSide(node, '===', 0) ||
		// `0 == foo.length`
		isLeftSide(node, '==', 0) ||
		// `1 > foo.length`
		isLeftSide(node, '>', 1)
	) {
		return node.right;
	}
}

const create = context => {
	const options = {
		'non-zero': 'greater-than',
		...context.options[0]
	};
	const nonZeroStyle = nonZeroStyles.get(options['non-zero']);
	const sourceCode = context.getSourceCode();

	function checkExpression(node) {
		let expression = node;
		while (isLogicNot(expression)) {
			expression = expression.argument;
		}

		if (expression.type === 'LogicalExpression') {
			checkExpression(expression.left);
			checkExpression(expression.right);
			return;
		}

		// Is matched style
		if (nonZeroStyle.test(node) || zeroStyle.test(node)) {
			return;
		}

		const nonZeroLengthNode = getNonZeroLengthNode(node);
		if (nonZeroLengthNode) {
			context.report({
				node,
				messageId: 'non-zero',
				data: {code: nonZeroStyle.code},
				fix: fixer => fixer.replaceText(node, `${sourceCode.getText(nonZeroLengthNode)} ${nonZeroStyle.code}`)
			});
			return;
		}

		const zeroLengthNode = getZeroLengthNode(node);
		if (zeroLengthNode) {
			context.report({
				node,
				messageId: 'zero',
				data: {code: zeroStyle.code},
				fix: fixer => fixer.replaceText(node, `${sourceCode.getText(zeroLengthNode)} ${zeroStyle.code}`)
			});
		}
	}

	return {
		'IfStatement, ConditionalExpression': node => {
			checkExpression(node.test);
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
