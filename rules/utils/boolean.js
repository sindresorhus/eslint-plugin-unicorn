'use strict';

const isLogicalExpression = require('./is-logical-expression');

const isLogicNot = node =>
	node &&
	node.type === 'UnaryExpression' &&
	node.operator === '!';
const isLogicNotArgument = node =>
	isLogicNot(node.parent) &&
	node.parent.argument === node;
const isBooleanCallArgument = node =>
	isBooleanCall(node.parent) &&
	node.parent.arguments[0] === node;
const isBooleanCall = node =>
	node &&
	node.type === 'CallExpression' &&
	node.callee &&
	node.callee.type === 'Identifier' &&
	node.callee.name === 'Boolean' &&
	node.arguments.length === 1;

/**
Check if the value of node is a `boolean`.

@param {Node} node
@returns {boolean}
*/
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

	if (isLogicalExpression(parent)) {
		return isBooleanNode(parent);
	}

	return false;
}

/**
Get the boolean type-casting ancestor.

@typedef {{ node: Node, isNegative: boolean }} Result

@param {Node} node
@returns {Result}
*/
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

module.exports = {isBooleanNode, getBooleanAncestor};
