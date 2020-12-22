'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const isLiteralValue = require('./utils/is-literal-value');

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
const isLogicNotArgument = node =>
	node.parent &&
	isLogicNot(node.parent) &&
	node.parent.argument === node;
const isCompareRight = (node, operator, value) =>
	node.operator === operator &&
	isLiteralValue(node.right, value);
const isCompareLeft = (node, operator, value) =>
	node.operator === operator &&
	isLiteralValue(node.left, value);
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

const lengthPropertySelector = [
	'MemberExpression',
	'[computed=false]',
	'[property.type="Identifier"]',
	'[property.name="length"]'
].join('');

function getRemovableBooleanParent(node) {
	let isNegative = false;
	while (isLogicNotArgument(node)) {
		isNegative = !isNegative;
		node = node.parent;
	}
	return {node, isNegative};
}

function getLengthCheckType(node) {
	if (!node || node.type !== 'BinaryExpression') {
		return;
	}

	if (
		// Zero length check
		// `foo.length === 0`
		isCompareRight(node, '===', 0) ||
		// `foo.length == 0`
		isCompareRight(node, '==', 0) ||
		// `foo.length < 1`
		isCompareRight(node, '<', 1) ||
		// `0 === foo.length`
		isCompareLeft(node, '===', 0) ||
		// `0 == foo.length`
		isCompareLeft(node, '==', 0) ||
		// `1 > foo.length`
		isCompareLeft(node, '>', 1)
	) {
		return {zeroLength: true};
	}

	if (
		// Non-Zero length check
		// `foo.length !== 0`
		isCompareRight(node, '!==', 0) ||
		// `foo.length != 0`
		isCompareRight(node, '!=', 0) ||
		// `foo.length > 0`
		isCompareRight(node, '>', 0) ||
		// `foo.length >= 1`
		isCompareRight(node, '>=', 1) ||
		// `0 !== foo.length`
		isCompareLeft(node, '!==', 0) ||
		// `0 !== foo.length`
		isCompareLeft(node, '!=', 0) ||
		// `0 < foo.length`
		isCompareLeft(node, '<', 0) ||
		// `1 <= foo.length`
		isCompareLeft(node, '<=', 1)
	) {
		return {zeroLength: false};
	}
}

function isBooleanNode(node) {
	if (isLogicNot(node)) {
		return true;
	}

	let {parent} = node;
	if (!parent) {
		return false;
	}

	if (isLogicNotArgument(node)) {
		return true;
	}

	if (parent.type === 'LogicalExpression') {
		return isBooleanNode(parent);
	}

	if (
		(
			parent.type === 'IfStatement' ||
			parent.type === 'ConditionalExpression' ||
			parent.type === 'WhileStatement' ||
			parent.type === 'DoWhileStatement' ||
			parent.type === 'ForStatement'
		) &&
		parent.test === node
	) {
		return true;
	}

	return false;
}

function create(context) {
	const options = {
		'non-zero': 'greater-than',
		...context.options[0]
	};
	const nonZeroStyle = nonZeroStyles.get(options['non-zero']);
	const sourceCode = context.getSourceCode();

	function reportProblem({node, zeroLength, lengthNode}) {
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

	return {
		[lengthPropertySelector](lengthNode) {
			const {parent} = lengthNode;
			let {zeroLength} = getLengthCheckType(parent) || {};
			let replaceNode;
			if (typeof zeroLength === 'boolean') {
				const {isNegative, node} = getRemovableBooleanParent(parent);
				replaceNode = node;
				if (isNegative) {
					zeroLength = !zeroLength;
				}
			} else {
				const {isNegative, node} = getRemovableBooleanParent(lengthNode);
				if (isBooleanNode(node)) {
					zeroLength = isNegative;
					replaceNode = node
				}
			}

			if (replaceNode) {
				reportProblem({node: replaceNode, zeroLength, lengthNode});
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
