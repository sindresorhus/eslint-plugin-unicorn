'use strict';

const isLogicalExpression = require('./is-logical-expression.js');
const findReference = require('./find-reference.js');

const isLogicNot = node =>
	node
	&& node.type === 'UnaryExpression'
	&& node.operator === '!';
const isLogicNotArgument = node =>
	isLogicNot(node.parent)
	&& node.parent.argument === node;
const isBooleanCallArgument = node =>
	isBooleanCall(node.parent)
	&& node.parent.arguments[0] === node;
const isBooleanCall = node =>
	node
	&& node.type === 'CallExpression'
	&& node.callee
	&& node.callee.type === 'Identifier'
	&& node.callee.name === 'Boolean'
	&& node.arguments.length === 1;
const isVueBooleanAttributeValue = node =>
	node
	&& node.type === 'VExpressionContainer'
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
@param {Scope} scope The Scope to start checking from
@returns {boolean}
*/
function isBooleanNode(node, scope) {
	if (
		isLogicNot(node)
		|| isLogicNotArgument(node)
		|| isBooleanCall(node)
		|| isBooleanCallArgument(node)
	) {
		return true;
	}

	const {parent} = node;
	if (isVueBooleanAttributeValue(parent)) {
		return true;
	}

	if (
		(
			parent.type === 'IfStatement'
			|| parent.type === 'ConditionalExpression'
			|| parent.type === 'WhileStatement'
			|| parent.type === 'DoWhileStatement'
			|| parent.type === 'ForStatement'
		)
		&& parent.test === node
	) {
		return true;
	}

	if (isLogicalExpression(parent)) {
		return isBooleanNode(parent);
	}

	if (scope && parent.type === 'VariableDeclarator') {
		const reference = findReference(scope, parent.id);

		if (!reference) {
			return false;
		}

		// Skip variable declaration of current node
		const references = reference.resolved.references.filter(r => {
			const parentNode = r.identifier.parent;
			return parentNode.type !== 'VariableDeclarator' || parentNode.id !== parent.id;
		});

		if (references.length === 0) {
			return false;
		}

		return references.every(r => isBooleanNode(r.identifier));
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
