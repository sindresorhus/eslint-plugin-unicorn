'use strict';
const isSameReference = require('../utils/is-same-reference');
const {getParenthesizedRange} = require('../utils/parentheses');

const isLengthMemberExpression = node =>
	node.type === 'MemberExpression' &&
	!node.computed &&
	!node.optional &&
	node.property.type === 'Identifier' &&
	node.property.name === 'length';
const isLiteralPositiveNumber = node =>
	node.type === 'Literal' &&
	typeof node.value === 'number' &&
	node.value > 0;

function getNegativeIndexLengthNode(node, objectNode) {
	if (!node) {
		return;
	}

	const {type, operator, left, right} = node;

	if (type !== 'BinaryExpression' || operator !== '-' || !isLiteralPositiveNumber(right)) {
		return;
	}

	if (isLengthMemberExpression(left) && isSameReference(left.object, objectNode)) {
		return left;
	}

	// Nested BinaryExpression
	return getNegativeIndexLengthNode(left, objectNode);
}

function removeLengthNode(node, fixer, sourceCode) {
	const [start, end] = getParenthesizedRange(node, sourceCode);
	return fixer.removeRange([
		start,
		end + sourceCode.text.slice(end).match(/\S|$/).index
	]);
}

module.exports = {
	getNegativeIndexLengthNode,
	removeLengthNode
};
