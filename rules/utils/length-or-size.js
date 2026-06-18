import {getStaticValue} from '@eslint-community/eslint-utils';
import {isMemberExpression} from '../ast/index.js';
import isLogicalExpression from './is-logical-expression.js';
import isSameReference from './is-same-reference.js';

const shapeProperties = new Set(['depth', 'height', 'width']);

export function isLengthOrSizeMemberExpression(node) {
	return isMemberExpression(node, {
		properties: ['length', 'size'],
		optional: false,
	});
}

function getLogicalExpressionRoot(node) {
	while (
		isLogicalExpression(node.parent)
		&& node.parent.operator === '&&'
	) {
		node = node.parent;
	}

	return node;
}

function getLogicalExpressionOperands(node) {
	return [node.left, node.right].flatMap(child =>
		child.type === 'LogicalExpression' && child.operator === node.operator
			? getLogicalExpressionOperands(child)
			: [child]);
}

export function hasSameObjectShapePropertyCheck({node, lengthOrSizeNode}) {
	const root = getLogicalExpressionRoot(node);
	if (
		root.type !== 'LogicalExpression'
		|| root.operator !== '&&'
	) {
		return false;
	}

	return getLogicalExpressionOperands(root).some(operand =>
		operand !== node
		&& isMemberExpression(operand, {computed: false, optional: false})
		&& operand.property.type === 'Identifier'
		&& shapeProperties.has(operand.property.name)
		&& isSameReference(operand.object, lengthOrSizeNode.object));
}

export function isKnownNonCollectionLengthOrSize(memberExpression, context) {
	const staticValue = getStaticValue(memberExpression, context.sourceCode.getScope(memberExpression));
	return Boolean(staticValue && (!Number.isSafeInteger(staticValue.value) || staticValue.value < 0));
}
