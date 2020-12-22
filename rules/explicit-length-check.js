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

const isLogicNot = node =>
	node.type === 'UnaryExpression' &&
	node.operator === '!';
const isLogicNotArgument = node =>
	node.parent &&
	isLogicNot(node.parent) &&
	node.parent.argument === node;
const isCompareRight = (node, operator, value) =>
	node.type === 'BinaryExpression' &&
	node.operator === operator &&
	isLiteralValue(node.right, value);
const isCompareLeft = (node, operator, value) =>
	node.type === 'BinaryExpression' &&
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

const lengthSelector = [
	'MemberExpression',
	'[computed=false]',
	'[property.type="Identifier"]',
	'[property.name="length"]'
].join('');

function getBooleanAncestor(node) {
	let isNegative = false;
	while (isLogicNotArgument(node)) {
		isNegative = !isNegative;
		node = node.parent;
	}

	return {node, isNegative};
}

function getLengthCheckNode(node) {
	node = node.parent;

	// Zero length check
	if (
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
		return {isZeroLengthCheck: true, node};
	}

	// Non-Zero length check
	if (
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
		return {isZeroLengthCheck: false, node};
	}

	return {};
}

function isBooleanNode(node) {
	if (isLogicNot(node) || isLogicNotArgument(node)) {
		return true;
	}

	const {parent} = node;
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

	if (parent.type === 'LogicalExpression') {
		return isBooleanNode(parent);
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

	function reportProblem({node, isZeroLengthCheck, lengthNode}) {
		const {code, test} = isZeroLengthCheck ? zeroStyle : nonZeroStyle;
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
			messageId: isZeroLengthCheck ? TYPE_ZERO : TYPE_NON_ZERO,
			data: {code},
			fix: fixer => fixer.replaceText(node, fixed)
		});
	}

	return {
		[lengthSelector](lengthNode) {
			let node;

			let {isZeroLengthCheck, node: lengthCheckNode} = getLengthCheckNode(lengthNode);
			if (lengthCheckNode) {
				const {isNegative, node: ancestor} = getBooleanAncestor(lengthCheckNode);
				node = ancestor;
				if (isNegative) {
					isZeroLengthCheck = !isZeroLengthCheck;
				}
			} else {
				const {isNegative, node: ancestor} = getBooleanAncestor(lengthNode);
				if (isBooleanNode(ancestor)) {
					isZeroLengthCheck = isNegative;
					node = ancestor;
				}
			}

			if (node) {
				reportProblem({node, isZeroLengthCheck, lengthNode});
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
