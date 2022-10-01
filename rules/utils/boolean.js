'use strict';

const isLogicalExpression = require('./is-logical-expression.js');

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

	const { parent } = node;
	if (isVueBooleanAttributeValue(parent)) {
		return true;
	}

	if (isSafelyBooleanCastable(node)) {
		return true;
	}

	if (isLogicalExpression(parent)) {
		return isBooleanNode(parent);
	}

	return false;
}

/**
Check if the value of node can be cast to `boolean` without affecting its behaviour.

@param {Node} node
@returns {boolean}
*/
function isSafelyBooleanCastable(node) {
	return (
		(node.parent.type === "IfStatement" ||
			node.parent.type === "ConditionalExpression" ||
			node.parent.type === "WhileStatement" ||
			node.parent.type === "DoWhileStatement" ||
			node.parent.type === "ForStatement") &&
		node.parent.test === node
	);
}

/**
Get the boolean type-casting ancestor.

@typedef {{ node: Node, isNegative: boolean, depth: number }} Result

@param {Node} node
@returns {Result}
*/
function getBooleanAncestor(node) {
	let depth = 0;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		if (isLogicNotArgument(node)) {
			depth += 1;
			node = node.parent;
		} else if (isBooleanCallArgument(node)) {
			depth += 2;
			node = node.parent;
		} else {
			break;
		}
	}

	return { node, isNegative: depth % 2 === 1, depth };
}

module.exports = {
	isBooleanNode,
	isLogicNot,
	isBooleanCall,
	isSafelyBooleanCastable,
	getBooleanAncestor,
};
