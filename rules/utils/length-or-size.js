import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {isFunction, isMemberExpression} from '../ast/index.js';
import isLogicalExpression from './is-logical-expression.js';
import isLeftHandSide from './is-left-hand-side.js';
import isSameReference from './is-same-reference.js';
import getStaticValueIfNoSideEffects, {getStaticValueForControlFlow} from './get-static-value.js';
import hasOptionalChainElement from './has-optional-chain-element.js';
import isGlobalIdentifier from './is-global-identifier.js';

const shapeProperties = new Set(['depth', 'height', 'width']);
const executionContextTypes = new Set([
	'AccessorProperty',
	'MethodDefinition',
	'PropertyDefinition',
	'StaticBlock',
	'TSAbstractAccessorProperty',
	'TSAbstractMethodDefinition',
	'TSAbstractPropertyDefinition',
]);

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
	&& node.properties.every(property => property.type !== 'SpreadElement')
	&& node.properties.some(property =>
		property.type === 'Property'
		&& ['get', 'set'].includes(getPropertyName(property, context.sourceCode.getScope(property))),
	);

const getObjectMethodCallExpression = (reference, context) => {
	const callExpression = reference.identifier.parent;
	if (
		callExpression?.type !== 'CallExpression'
		|| callExpression.optional
		|| callExpression.callee.type !== 'MemberExpression'
		|| callExpression.callee.optional
		|| callExpression.callee.object.type !== 'Identifier'
		|| !isGlobalIdentifier(callExpression.callee.object, context)
		|| callExpression.arguments[0] !== reference.identifier
	) {
		return;
	}

	return callExpression;
};

const getLastObjectProperty = (objectExpression, propertyName, context) => {
	for (const property of objectExpression.properties.toReversed()) {
		if (property.type === 'SpreadElement') {
			return;
		}

		const name = getPropertyName(property, context.sourceCode.getScope(property));
		if (name === undefined && property.computed) {
			return;
		}

		if (name === propertyName) {
			return property;
		}
	}
};

const hasUnknownObjectProperty = (objectExpression, context) =>
	objectExpression?.type !== 'ObjectExpression'
	|| objectExpression.properties.some(property =>
		property.type === 'SpreadElement'
		|| (property.type === 'Property'
			&& property.computed
			&& getPropertyName(property, context.sourceCode.getScope(property)) === undefined),
	);

const isUnconditionallyExecutedSwitchCase = node =>
	node.parent?.type === 'SwitchCase'
	&& node.parent.test === null
	&& node.parent.parent.cases.length === 1;

const getObjectPropertyDefinition = (reference, propertyName, context) => {
	const callExpression = getObjectMethodCallExpression(reference, context);
	if (!callExpression) {
		return;
	}

	const method = getPropertyName(callExpression.callee, context.sourceCode.getScope(callExpression.callee));
	if (method === 'defineProperty') {
		const propertyKey = callExpression.arguments[1];
		return propertyKey
			&& getStaticValueForControlFlow(propertyKey, context)?.value === propertyName
			? callExpression.arguments[2]
			: undefined;
	}

	if (method !== 'defineProperties' || callExpression.arguments[1]?.type !== 'ObjectExpression') {
		return;
	}

	return getLastObjectProperty(callExpression.arguments[1], propertyName, context)?.value;
};

const getObjectAssignPropertyValue = (reference, propertyName, context) => {
	const callExpression = getObjectMethodCallExpression(reference, context);
	if (
		!callExpression
		|| getPropertyName(callExpression.callee, context.sourceCode.getScope(callExpression.callee)) !== 'assign'
		|| callExpression.arguments.length !== 2
		|| callExpression.arguments[1].type !== 'ObjectExpression'
		|| callExpression.arguments[1].properties.some(property => property.type === 'SpreadElement')
	) {
		return;
	}

	return getLastObjectProperty(callExpression.arguments[1], propertyName, context)?.value;
};

const isAccessorDefinition = (reference, propertyName, context) => {
	const descriptor = getObjectPropertyDefinition(reference, propertyName, context);
	return Boolean(descriptor && isAccessorDescriptor(descriptor, context));
};

const getAssignmentValue = (node, context) => {
	const path = [];
	let current = node;
	for (;;) {
		const {parent} = current;
		if (!parent) {
			return;
		}

		if (parent.type === 'AssignmentExpression') {
			if (parent.left !== current || parent.operator !== '=') {
				return;
			}

			let value = parent.right;
			for (const pathPart of path.toReversed()) {
				if (!value) {
					return;
				}

				if (pathPart.type === 'array') {
					value = value.type === 'ArrayExpression' ? value.elements[pathPart.index] : undefined;
				} else {
					value = value.type === 'ObjectExpression'
						? getLastObjectProperty(value, pathPart.propertyName, context)?.value
						: undefined;
				}
			}

			return value;
		}

		if (parent.type === 'ArrayPattern') {
			const index = parent.elements.indexOf(current);
			if (index === -1) {
				return;
			}

			path.push({type: 'array', index});
		} else if (parent.type === 'Property' && parent.parent.type === 'ObjectPattern') {
			path.push({
				type: 'object',
				propertyName: getPropertyName(parent, context.sourceCode.getScope(parent)),
			});
		} else if (parent.type === 'RestElement' || parent.type === 'AssignmentPattern') {
			return;
		}

		current = parent;
	}
};

const isKnownNonNegativeInteger = (node, context) => {
	if (!node) {
		return false;
	}

	const staticValue = getStaticValueForControlFlow(node, context);
	return Boolean(staticValue && Number.isSafeInteger(staticValue.value) && staticValue.value >= 0);
};

const isKnownNumericPropertyMutation = (reference, propertyName, context) => {
	const descriptor = getObjectPropertyDefinition(reference, propertyName, context);
	if (descriptor?.type === 'ObjectExpression') {
		const value = getLastObjectProperty(descriptor, 'value', context)?.value;
		return isKnownNonNegativeInteger(value, context);
	}

	const node = getReferencedMemberExpression(reference);
	if (!node) {
		return isKnownNonNegativeInteger(getObjectAssignPropertyValue(reference, propertyName, context), context);
	}

	const {parent} = node;
	if (parent?.type === 'ForInStatement') {
		return false;
	}

	if (parent?.type === 'ForOfStatement') {
		const staticValue = getStaticValueForControlFlow(parent.right, context)?.value;
		return Array.isArray(staticValue) && staticValue.length > 0 && staticValue.every(value => Number.isSafeInteger(value) && value >= 0);
	}

	return isKnownNonNegativeInteger(getAssignmentValue(node, context), context);
};

const getEnclosingExecutionContext = node => {
	for (let current = node.parent; current; current = current.parent) {
		if (isFunction(current) || executionContextTypes.has(current.type)) {
			return current;
		}
	}
};

const isConditionallyExecuted = (node, context) => {
	for (let current = node; current.parent; current = current.parent) {
		const {parent} = current;
		if (
			(parent.type === 'IfStatement' || parent.type === 'ConditionalExpression')
			&& (parent.consequent === current || parent.alternate === current)
		) {
			const staticValue = getStaticValueForControlFlow(parent.test, context);
			if (staticValue && Boolean(staticValue.value) === (parent.consequent === current)) {
				continue;
			}

			return true;
		}

		if (
			(parent.type === 'LogicalExpression' && parent.right === current)
			|| (parent.type === 'ForStatement' && (parent.body === current || parent.update === current))
			|| (['WhileStatement', 'ForInStatement', 'ForOfStatement'].includes(parent.type) && parent.body === current)
			|| (parent.type === 'SwitchCase' && parent.consequent.includes(current) && !isUnconditionallyExecutedSwitchCase(current))
			|| (parent.type === 'CatchClause' && parent.body === current)
			|| (parent.type === 'TryStatement' && parent.block === current)
			|| (parent.type === 'AssignmentPattern' && parent.right === current)
			|| (parent.type === 'MemberExpression'
				&& parent.computed
				&& parent.property === current
				&& hasOptionalChainElement(parent))
			|| (parent.type === 'CallExpression'
				&& (parent.optional || hasOptionalChainElement(parent.callee))
				&& parent.arguments.includes(current))
		) {
			return true;
		}
	}

	return false;
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

	const callExpression = getObjectMethodCallExpression(reference, context);
	if (callExpression) {
		const method = getPropertyName(callExpression.callee, context.sourceCode.getScope(callExpression.callee));
		if (method === 'assign') {
			if (callExpression.arguments.length < 2) {
				return false;
			}

			if (getObjectAssignPropertyValue(reference, propertyName, context)) {
				return true;
			}

			const source = callExpression.arguments[1];
			return callExpression.arguments.length !== 2 || hasUnknownObjectProperty(source, context);
		}

		if (method === 'defineProperty') {
			const propertyKey = callExpression.arguments[1];
			const staticValue = propertyKey && getStaticValueForControlFlow(propertyKey, context);
			return !staticValue || staticValue.value === propertyName;
		}

		if (method === 'defineProperties') {
			const definitions = callExpression.arguments[1];
			return hasUnknownObjectProperty(definitions, context);
		}
	}

	const node = getReferencedMemberExpression(reference);
	if (
		!node
		|| getPropertyName(node, context.sourceCode.getScope(node)) !== propertyName
	) {
		return false;
	}

	const {parent} = node;
	return isLeftHandSide(node)
		|| ((parent?.type === 'ForOfStatement' || parent?.type === 'ForInStatement') && parent.left === node);
};

const isForInPropertyMutation = (reference, propertyName, context) => {
	const node = getReferencedMemberExpression(reference);
	return Boolean(
		node
		&& getPropertyName(node, context.sourceCode.getScope(node)) === propertyName
		&& node.parent?.type === 'ForInStatement'
		&& node.parent.left === node,
	);
};

const isPropertyRead = (reference, propertyName, context) => {
	const node = getReferencedMemberExpression(reference);
	if (
		!node
		|| getPropertyName(node, context.sourceCode.getScope(node)) !== propertyName
	) {
		const callExpression = getObjectMethodCallExpression(reference, context);
		const method = callExpression && getPropertyName(callExpression.callee, context.sourceCode.getScope(callExpression.callee));
		return Boolean(
			callExpression
			&& ['assign', 'defineProperty', 'defineProperties'].includes(method),
		);
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
	const enclosingExecutionContext = getEnclosingExecutionContext(memberExpression);
	let hasUnknownEffect = false;
	let hasKnownNumericMutation = false;
	let hasAccessorDefinition = false;
	for (const reference of nonInitializationReferences) {
		const isInUnknownExecutionContext = getEnclosingExecutionContext(reference.identifier) !== enclosingExecutionContext
			|| isConditionallyExecuted(reference.identifier, context);
		if (isForInPropertyMutation(reference, propertyName, context)) {
			hasUnknownEffect = true;
			continue;
		}

		if (isPropertyMutation(reference, propertyName, context)) {
			if (!isInUnknownExecutionContext && isKnownNumericPropertyMutation(reference, propertyName, context)) {
				hasKnownNumericMutation = true;
			} else {
				hasUnknownEffect = true;
			}

			continue;
		}

		if (isAccessorDefinition(reference, propertyName, context)) {
			if (isInUnknownExecutionContext) {
				hasUnknownEffect = true;
				continue;
			}

			hasAccessorDefinition = true;
			continue;
		}

		if (!isPropertyRead(reference, propertyName, context)) {
			if (isInUnknownExecutionContext) {
				hasUnknownEffect = true;
				continue;
			}

			return false;
		}
	}

	// Conditionally executed code may run before or after the read, and unknown mutations may change the value.
	if (hasUnknownEffect) {
		return true;
	}

	if (hasKnownNumericMutation) {
		return false;
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
