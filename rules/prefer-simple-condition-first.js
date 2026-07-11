import {
	isParenthesized,
	getParenthesizedText,
	getParenthesizedRange,
	shouldAddParenthesesToLogicalExpressionChild,
	isBooleanExpression,
	isControlFlowTest,
	isTypeScriptExpressionWrapper,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-simple-condition-first';
const MESSAGE_ID_UNSAFE = 'prefer-simple-condition-first/unsafe';

const messages = {
	[MESSAGE_ID]: 'Prefer this simple condition first in the `{{operator}}` expression.',
	[MESSAGE_ID_UNSAFE]: 'Consider moving this simple condition first after verifying short-circuit behavior.',
};

/**
Check if a node can be an operand in a simple strict comparison.
*/
function isSimpleOperand(node) {
	node = unwrapTypeScriptExpression(node);

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
		const left = unwrapTypeScriptExpression(node.left);
		const right = unwrapTypeScriptExpression(node.right);
		return isSimpleOperand(left) && isSimpleOperand(right)
			&& (left.type === 'Identifier' || right.type === 'Identifier');
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
Check if a LogicalExpression is used in a boolean context where the produced value is only tested for truthiness, not consumed as a value.
*/
function isBooleanContext(node, context) {
	if (isBooleanExpression(node, context) || isControlFlowTest(node)) {
		return true;
	}

	const {parent} = node;
	return isTypeScriptExpressionWrapper(parent)
		&& parent.expression === node
		&& isBooleanContext(parent, context);
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

function isSafeConditionalExpression(node) {
	const unwrappedNode = unwrapTypeScriptExpression(node);
	return unwrappedNode.type === 'ConditionalExpression'
		&& [unwrappedNode.test, unwrappedNode.consequent, unwrappedNode.alternate].every(child =>
			isSimple(child) || isSimpleOperand(child) || isSafeConditionalExpression(child),
		);
}

function isSafeToMove(node) {
	return isSimple(node) || isSafeConditionalExpression(node);
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

function hasTypeScriptWrappedLogicalExpression(node, operator) {
	if (isTypeScriptExpressionWrapper(node)) {
		const unwrappedNode = unwrapTypeScriptExpression(node);
		return unwrappedNode.type === 'LogicalExpression' && unwrappedNode.operator === operator;
	}

	return node.type === 'LogicalExpression'
		&& node.operator === operator
		&& (hasTypeScriptWrappedLogicalExpression(node.left, operator) || hasTypeScriptWrappedLogicalExpression(node.right, operator));
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

		if (!isBooleanContext(node, context)) {
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
		const lastSimpleOperandIndex = classifiedOperands.findLastIndex(({isSimple}) => isSimple);
		const canSafelyReorder = classifiedOperands.every(
			({operand, isSimple}, index) => isSimple || index > lastSimpleOperandIndex || isSafeToMove(operand),
		);
		const canFix = canSafelyReorder
			&& !hasTypeScriptWrappedLogicalExpression(node, node.operator)
			&& !hasCommentsThatPreventFix(node, operands, context);
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
			messageId: canSafelyReorder ? MESSAGE_ID : MESSAGE_ID_UNSAFE,
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
			recommended: true,
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
