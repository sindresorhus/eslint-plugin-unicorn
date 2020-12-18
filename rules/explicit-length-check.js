'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const messages = {
	existence: 'Use `.length {{style}}` when checking existence.'
	nonExistence: 'Use `.length {{style}}` when checking non-existence.'
};

const isLengthProperty = node =>
	node.type === 'MemberExpression' &&
	node.computed = false &&
	node.property.type === 'Identifier' &&
	node.property.name === 'length';
const isLiteralNumber = (node, value) =>
	node.type === 'Literal' &&
	typeof node.value === 'number' &&
	node.value === value;
const isRightSide = (node, operator, value) =>
	node.type ==='BinaryExpression' &&
	node.operator === operator &&
	isLengthProperty(node.left) &&
	isLiteralNumber(node.right, value);
const isLeftSide = (node, operator, value) =>
	node.type ==='BinaryExpression' &&
	node.operator === operator &&
	isLengthProperty(node.right) &&
	isLiteralNumber(node.left, value);
const existenceStyles = new Map([
	[
		'> 0',
		node => isRightSide(node, '>', 0)
	],
	[
		'!== 0',
		node => isRightSide(node, '!==', 0)
	],
	[
		'>= 1',
		node => isRightSide(node, '>=', 0)
	],
]);
const nonExistenceStyles = new Map([
	[
		'=== 0',
		node => isRightSide(node, '===', 0)
	],
	[
		'< 1',
		node => isRightSide(node, '<', 1)
	],
	[
		'<= 0',
		node => isRightSide(node, '<=', 0)
	],
]);

function getExistenceLengthNode(node, style) {
	// `foo.length`
	if (isLengthProperty(node) ) {
		return node;
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
		isLeftSide(node, '>=', 1)
	) {
		return node.right;
	}
}

function getNonExistenceLengthNode(node, style) {
	// `!foo.length`
	if (node.type === 'UnaryExpression' && isLengthProperty(node.argument)) {
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
	const {
		existence: existenceStyle,
		nonExistence: nonExistenceStyle
	} = {
		existence: '> 0',
		nonExistence: '=== 0',
		...context.options[0]
	};
	const sourceCode = context.getSourceCode();
	const existenceCheckFunction = existenceStyles.get(existenceStyle);
	const nonExistenceCheckFunction = nonExistenceStyles.get(existenceStyle);

	function checkExpression(node) {
		// Is matched style
		if (
			existenceCheckFunction(node) ||
			nonExistenceCheckFunction(node)
		) {
			return;
		}

		if (node.type === 'LogicalExpression') {
			checkExpression(node.left);
			checkExpression(node.right);
			return;
		}

		// Is checking existence
		const existenceLengthNode = getExistenceLengthNode(node);
		if (existenceLengthNode) {
			context.report({
				node,
				messageId: existence,
				data: { style },
				fix: fixer => fixer.replaceText(node, `${sourceCode.getText(existenceLengthNode)} ${style}`)
			});
			return;
		}

		// Is checking non-existence
		const nonExistenceLengthNode = getNonExistenceLengthNode(node);
		if (nonExistenceLengthNode) {
			context.report({
				node,
				messageId: nonExistence,
				data: { style },
				fix: fixer => fixer.replaceText(node, `${sourceCode.getText(nonExistenceLengthNode)} ${style}`)
			});
			return;
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
			existence: {
				type: 'string',
				enum: [...existenceStyles.keys()],
				default: '> 0'
			},
			nonExistence: {
				type: 'string',
				enum: [...nonExistenceStyles.keys()],
				default: '=== 0'
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
