import isLogicalExpression from './is-logical-expression.js';

const isLogicNot = node => node?.type === 'UnaryExpression' && node.operator === '!';
const isLogicNotArgument = node => isLogicNot(node.parent) && node.parent.argument === node;
const isBooleanCallArgument = node => isBooleanCall(node.parent) && node.parent.arguments[0] === node;
const isBooleanCall = node =>
	node?.type === 'CallExpression'
	&& node.callee.type === 'Identifier'
	&& node.callee.name === 'Boolean'
	&& node.arguments.length === 1;
const isVueBooleanAttributeValue = node =>
	node?.type === 'VExpressionContainer'
	&& node.parent.type === 'VAttribute'
	&& node.parent.directive
	&& node.parent.value === node
	&& node.parent.key.type === 'VDirectiveKey'
	&& node.parent.key.name.type === 'VIdentifier'
	&& (
		node.parent.key.name.rawName === 'if'
		|| node.parent.key.name.rawName === 'else-if'
		|| node.parent.key.name.rawName === 'show'
	);
const isDirectControlFlowTest = node =>
	(
		node.parent?.type === 'IfStatement'
		|| node.parent?.type === 'ConditionalExpression'
		|| node.parent?.type === 'WhileStatement'
		|| node.parent?.type === 'DoWhileStatement'
		|| node.parent?.type === 'ForStatement'
	)
	&& node.parent.test === node;
const isDirectBooleanExpression = node =>
	isLogicNot(node)
	|| isLogicNotArgument(node)
	|| isBooleanCall(node)
	|| isBooleanCallArgument(node);

/**
Check if the expression value of `node` is a `boolean`.

@param {Node} node
@returns {boolean}
*/
export function isBooleanExpression(node) {
	if (isDirectBooleanExpression(node)) {
		return true;
	}

	if (isLogicalExpression(node.parent)) {
		return isBooleanExpression(node.parent);
	}

	return false;
}

/**
Check if `node` is used as a control-flow test.

@param {Node} node
@returns {boolean}
*/
export function isControlFlowTest(node) {
	if (isVueBooleanAttributeValue(node.parent) || isDirectControlFlowTest(node)) {
		return true;
	}

	if (isLogicalExpression(node.parent)) {
		return isControlFlowTest(node.parent);
	}

	return false;
}

/**
Get the boolean type-casting ancestor.

@typedef {{ node: Node, isNegative: boolean }} Result

@param {Node} node
@returns {Result}
*/
export function getBooleanAncestor(node) {
	let isNegative = false;

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
