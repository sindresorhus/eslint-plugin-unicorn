import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {isMemberExpression} from '../ast/index.js';
import isLogicalExpression from './is-logical-expression.js';
import isSameReference from './is-same-reference.js';
import getStaticValueIfNoSideEffects from './get-static-value.js';
import isGlobalIdentifier from './is-global-identifier.js';

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

const isAccessorDescriptor = (node, context) =>
	node?.type === 'ObjectExpression'
	&& node.properties.some(property =>
		property.type === 'Property'
		&& ['get', 'set'].includes(getPropertyName(property, context.sourceCode.getScope(property))),
	);

const getObjectPropertyDefinition = (reference, propertyName, context) => {
	const callExpression = reference.identifier.parent;
	if (
		callExpression?.type !== 'CallExpression'
		|| callExpression.callee.type !== 'MemberExpression'
		|| callExpression.callee.object.type !== 'Identifier'
		|| !isGlobalIdentifier(callExpression.callee.object, context)
		|| callExpression.arguments[0] !== reference.identifier
	) {
		return;
	}

	const method = getPropertyName(callExpression.callee, context.sourceCode.getScope(callExpression.callee));
	if (method === 'defineProperty') {
		const propertyKey = callExpression.arguments[1];
		return propertyKey
			&& getStaticValueIfNoSideEffects(propertyKey, context)?.value === propertyName
			? callExpression.arguments[2]
			: undefined;
	}

	if (method !== 'defineProperties' || callExpression.arguments[1]?.type !== 'ObjectExpression') {
		return;
	}

	return callExpression.arguments[1].properties.find(property =>
		property.type === 'Property'
		&& getPropertyName(property, context.sourceCode.getScope(property)) === propertyName,
	)?.value;
};

const isAccessorDefinition = (reference, propertyName, context) => {
	const descriptor = getObjectPropertyDefinition(reference, propertyName, context);
	return Boolean(descriptor && isAccessorDescriptor(descriptor, context));
};

const getReferencedMemberExpression = reference => {
	let node = reference.identifier;
	while (node.parent?.type === 'MemberExpression' && node.parent.object === node) {
		node = node.parent;
	}

	return node.type === 'MemberExpression' ? node : undefined;
};

const isPropertyMutation = (reference, propertyName, context) => {
	const descriptor = getObjectPropertyDefinition(reference, propertyName, context);
	if (descriptor) {
		return !isAccessorDescriptor(descriptor, context);
	}

	const node = getReferencedMemberExpression(reference);
	if (
		!node
		|| getPropertyName(node, context.sourceCode.getScope(node)) !== propertyName
	) {
		return false;
	}

	const {parent} = node;
	return (
		(parent?.type === 'AssignmentExpression' && parent.left === node)
		|| (parent?.type === 'UpdateExpression' && parent.argument === node)
		|| (parent?.type === 'UnaryExpression' && parent.operator === 'delete' && parent.argument === node)
	);
};

const isPropertyRead = (reference, propertyName, context) => {
	const node = getReferencedMemberExpression(reference);
	if (
		!node
		|| getPropertyName(node, context.sourceCode.getScope(node)) !== propertyName
	) {
		return false;
	}

	const {parent} = node;
	return !(
		(parent?.type === 'CallExpression' && parent.callee === node)
		|| (parent?.type === 'NewExpression' && parent.callee === node)
		|| (parent?.type === 'TaggedTemplateExpression' && parent.tag === node)
	);
};

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
	const staticValue = getStaticValueIfNoSideEffects(memberExpression, context);
	if (staticValue) {
		return !Number.isSafeInteger(staticValue.value) || staticValue.value < 0;
	}

	const {object} = memberExpression;
	if (object.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(object), object);
	const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
	if (
		definition?.type !== 'Variable'
		|| definition.node.init?.type !== 'ObjectExpression'
	) {
		return false;
	}

	const propertyName = getPropertyName(memberExpression, context.sourceCode.getScope(memberExpression));
	const nonInitializationReferences = variable.references.filter(reference => !reference.init);
	let hasAccessorDefinition = false;
	for (const reference of nonInitializationReferences) {
		if (isPropertyMutation(reference, propertyName, context)) {
			return false;
		}

		if (isAccessorDefinition(reference, propertyName, context)) {
			hasAccessorDefinition = true;
			continue;
		}

		if (!isPropertyRead(reference, propertyName, context)) {
			return false;
		}
	}

	if (hasAccessorDefinition) {
		return true;
	}

	const staticObject = getStaticValueIfNoSideEffects(definition.node.init, context)?.value;
	return Boolean(
		staticObject
		&& (!Number.isSafeInteger(staticObject[propertyName]) || staticObject[propertyName] < 0),
	);
}
