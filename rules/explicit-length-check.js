'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const isLiteralValue = require('./utils/is-literal-value');

const TYPE_NON_ZERO = 'non-zero';
const TYPE_ZERO = 'zero';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const messages = {
	[TYPE_NON_ZERO]: 'Use `.length {{code}}` when checking length is not zero.',
	[TYPE_ZERO]: 'Use `.length {{code}}` when checking length is zero.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `.length` with `.length {{code}}`.'
};

const isLogicNot = node =>
	node &&
	node.type === 'UnaryExpression' &&
	node.operator === '!';
const isLogicNotArgument = node =>
	isLogicNot(node.parent) &&
	node.parent.argument === node;
const isBooleanCall = node =>
	node &&
	node.type === 'CallExpression' &&
	node.callee &&
	node.callee.type === 'Identifier' &&
	node.callee.name === 'Boolean' &&
	node.arguments.length === 1;
const isBooleanCallArgument = node =>
	isBooleanCall(node.parent) &&
	node.parent.arguments[0] === node;
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
	// eslint-disable-next-line no-constant-condition
	while (true) {
		if (isLogicNotArgument(node)) {
			isNegative = !isNegative;
			node = node.parent;
		} else if (isBooleanCallArgument(node)) {
			node = node.parent;
		} else {
			break;
		}
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
	if (
		isLogicNot(node) ||
		isLogicNotArgument(node) ||
		isBooleanCall(node) ||
		isBooleanCallArgument(node)
	) {
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

	function reportProblem({node, isZeroLengthCheck, lengthNode, autoFix}) {
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

		const fix = fixer => fixer.replaceText(node, fixed);

		const problem = {
			node,
			messageId: isZeroLengthCheck ? TYPE_ZERO : TYPE_NON_ZERO,
			data: {code}
		};

		if (autoFix) {
			problem.fix = fix;
		} else {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data: {code},
					fix
				}
			];
		}

		context.report(problem);
	}

	return {
		[lengthSelector](lengthNode) {
			let node;
			let autoFix = true;

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
				} else if (lengthNode.parent.type === 'LogicalExpression') {
					isZeroLengthCheck = isNegative;
					node = lengthNode;
					autoFix = false;
				}
			}

			if (node) {
				reportProblem({node, isZeroLengthCheck, lengthNode, autoFix});
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
