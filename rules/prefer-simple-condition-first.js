import {
	isParenthesized,
	getParenthesizedText,
	getParenthesizedRange,
	shouldAddParenthesesToLogicalExpressionChild,
	isTypeScriptExpressionWrapper,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-simple-condition-first';

const messages = {
	[MESSAGE_ID]: 'Prefer simple condition first in `{{operator}}` expression.',
};

/**
Check if a node is a "simple" condition:
1. Bare identifier (`foo`)
2. A binary `===`/`!==` where each operand is an identifier, a literal, or a signed
   numeric literal (`-1`, `+0`), and at least one operand is an identifier.
*/
function isSimpleOperand(node) {
	if (node.type === 'Identifier' || node.type === 'Literal') {
		return true;
	}

	// Negative/positive numeric literals: `-1`, `+0`
	return node.type === 'UnaryExpression'
		&& (node.operator === '-' || node.operator === '+')
		&& node.argument.type === 'Literal'
		&& typeof node.argument.value === 'number';
}

function isSimple(node) {
	node = unwrapTypeScriptExpression(node);

	if (node.type === 'Identifier') {
		return true;
	}

	if (
		node.type === 'UnaryExpression'
		&& node.operator === '!'
	) {
		return isSimple(node.argument);
	}

	if (
		node.type === 'BinaryExpression'
		&& (node.operator === '===' || node.operator === '!==')
	) {
		return isSimpleOperand(node.left) && isSimpleOperand(node.right)
			&& (node.left.type === 'Identifier' || node.right.type === 'Identifier');
	}

	return false;
}

function getOperandText(node, context, {operator, property}) {
	const isNodeParenthesized = isParenthesized(node, context);
	let text = isNodeParenthesized
		? getParenthesizedText(node, context)
		: context.sourceCode.getText(node);

	if (
		!isNodeParenthesized
		&& shouldAddParenthesesToLogicalExpressionChild(node, {operator, property})
	) {
		text = `(${text})`;
	}

	return text;
}

/**
Check if a LogicalExpression is used in a boolean context where the
produced value is only tested for truthiness, not consumed as a value.
*/
function isBooleanContext(node) {
	const {parent} = node;

	if (!parent) {
		return false;
	}

	if (
		(parent.type === 'IfStatement' && parent.test === node)
		|| (parent.type === 'WhileStatement' && parent.test === node)
		|| (parent.type === 'DoWhileStatement' && parent.test === node)
		|| (parent.type === 'ForStatement' && parent.test === node)
		|| (parent.type === 'ConditionalExpression' && parent.test === node)
		|| (parent.type === 'UnaryExpression' && parent.operator === '!')
	) {
		return true;
	}

	// A LogicalExpression nested inside another LogicalExpression inherits its context
	if (parent.type === 'LogicalExpression') {
		return isBooleanContext(parent);
	}

	if (
		isTypeScriptExpressionWrapper(parent)
		&& parent.expression === node
	) {
		return isBooleanContext(parent);
	}

	return false;
}

function getOperands(node, operator) {
	const unwrappedNode = unwrapTypeScriptExpression(node);
	if (unwrappedNode.type !== 'LogicalExpression' || unwrappedNode.operator !== operator) {
		return [node];
	}

	return [
		...getOperands(unwrappedNode.left, operator),
		...getOperands(unwrappedNode.right, operator),
	];
}

function isSafeToMove(node) {
	if (isSimple(node)) {
		return true;
	}

	const unwrappedNode = unwrapTypeScriptExpression(node);
	return unwrappedNode.type === 'ConditionalExpression'
		&& isSafeToMove(unwrappedNode.test)
		&& isSafeToMove(unwrappedNode.consequent)
		&& isSafeToMove(unwrappedNode.alternate);
}

function hasSameOperatorLogicalParent(node) {
	const {operator} = node;
	let {parent} = node;
	while (
		isTypeScriptExpressionWrapper(parent)
		&& parent.expression === node
	) {
		node = parent;
		parent = node.parent;
	}

	return parent?.type === 'LogicalExpression' && parent.operator === operator;
}

function hasWrappedLogicalExpression(node, operator) {
	if (isTypeScriptExpressionWrapper(node)) {
		const unwrappedNode = unwrapTypeScriptExpression(node);
		return unwrappedNode.type === 'LogicalExpression' && unwrappedNode.operator === operator;
	}

	return node.type === 'LogicalExpression'
		&& node.operator === operator
		&& (hasWrappedLogicalExpression(node.left, operator) || hasWrappedLogicalExpression(node.right, operator));
}

function hasCommentsThatPreventFix(node, operands, context) {
	const {sourceCode} = context;
	if (sourceCode.getCommentsInside(node).length > 0) {
		return true;
	}

	const [firstOperand] = operands;
	const lastOperand = operands.at(-1);
	const [start] = getParenthesizedRange(firstOperand, context);
	const [, end] = getParenthesizedRange(lastOperand, context);
	return sourceCode.getAllComments().some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return (commentEnd <= start && sourceCode.text.slice(commentEnd, start).trim() === '')
			|| (commentStart >= end && sourceCode.text.slice(end, commentStart).trim() === '');
	});
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('LogicalExpression', node => {
		if (node.operator !== '&&' && node.operator !== '||') {
			return;
		}

		if (hasSameOperatorLogicalParent(node)) {
			return;
		}

		if (!isBooleanContext(node)) {
			return;
		}

		const operands = getOperands(node, node.operator);
		const classifiedOperands = operands.map(operand => ({operand, isSimple: isSimple(operand)}));
		const firstComplexOperandIndex = classifiedOperands.findIndex(({isSimple}) => !isSimple);
		const firstMisplacedSimpleOperandIndex = classifiedOperands.findIndex(
			({isSimple}, index) => isSimple && index > firstComplexOperandIndex,
		);
		if (
			firstComplexOperandIndex === -1
			|| firstMisplacedSimpleOperandIndex === -1
		) {
			return;
		}

		const reorderedOperands = [
			...classifiedOperands.filter(({isSimple}) => isSimple),
			...classifiedOperands.filter(({isSimple}) => !isSimple),
		].map(({operand}) => operand);
		const canFix = !hasWrappedLogicalExpression(node, node.operator)
			&& !hasCommentsThatPreventFix(node, operands, context)
			&& reorderedOperands.every(operand => isSafeToMove(operand));
		const fix = canFix
			? fixer => fixer.replaceTextRange(
				sourceCode.getRange(node),
				reorderedOperands
					.map((operand, index) => getOperandText(operand, context, {
						operator: node.operator,
						property: index === 0 ? 'left' : 'right',
					}))
					.join(` ${node.operator} `),
			)
			: undefined;

		return {
			node,
			loc: sourceCode.getLoc(operands[firstMisplacedSimpleOperandIndex]),
			messageId: MESSAGE_ID,
			data: {operator: node.operator},
			...(fix && {fix}),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer simple conditions first in logical expressions.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
