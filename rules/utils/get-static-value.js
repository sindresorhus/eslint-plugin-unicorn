import {
	findVariable,
	getStaticValue as getStaticValueFromEslintUtilities,
	hasSideEffect,
} from '@eslint-community/eslint-utils';
import unwrapTypeScriptExpression from './unwrap-typescript-expression.js';

export const isBranchExpression = node => {
	node = unwrapTypeScriptExpression(node);
	while (node.type === 'UnaryExpression') {
		node = unwrapTypeScriptExpression(node.argument);
	}

	return node.type === 'ConditionalExpression' || node.type === 'LogicalExpression';
};

const getConstVariableDefinition = (node, context) => {
	if (node.type !== 'Identifier' || !context) {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
	if (
		definition?.type !== 'Variable'
		|| definition.parent?.kind !== 'const'
		|| definition.node.id !== definition.name
		|| !definition.node.init
	) {
		return;
	}

	return {variable, initializer: definition.node.init};
};

const isStaticPropertyValue = value => typeof value === 'string' || typeof value === 'number';

const getStaticPropertyName = (node, property, context) => {
	if (property.type === 'Identifier' && !node.computed) {
		return property.name;
	}

	if (property.type === 'Literal' && isStaticPropertyValue(property.value)) {
		return String(property.value);
	}

	if (!node.computed || !context || (property.type === 'Identifier' && !getConstVariableDefinition(property, context))) {
		return;
	}

	const staticValue = getStaticValueFromEslintUtilities(property, context.sourceCode.getScope(property));
	if (staticValue && isStaticPropertyValue(staticValue.value)) {
		return String(staticValue.value);
	}
};

const getStaticMemberName = (node, context) => getStaticPropertyName(node, node.property, context);

const isSafeStaticObjectMember = (node, propertyName, context, visitedVariables) => {
	if (
		propertyName === undefined
		|| node.properties.some(property =>
			property.type !== 'Property'
			|| property.computed
			|| property.key.name === '__proto__'
			|| property.key.value === '__proto__'
			|| hasPotentiallyMutableMemberAccess(property.value, context, visitedVariables),
		)
	) {
		return false;
	}

	let property;
	for (const candidate of node.properties) {
		if (getStaticPropertyName(candidate, candidate.key) === propertyName) {
			property = candidate;
		}
	}

	return Boolean(
		property
		&& property.kind === 'init'
		&& !property.method,
	);
};

const isSafeStaticArrayMember = (node, propertyName, context, visitedVariables) => {
	if (node.elements.some(element =>
		element?.type === 'SpreadElement'
		|| (element && hasPotentiallyMutableMemberAccess(element, context, visitedVariables)),
	)) {
		return false;
	}

	if (propertyName === 'length') {
		return true;
	}

	const index = Number(propertyName);
	if (String(index) !== propertyName || index < 0 || index >= node.elements.length) {
		return false;
	}

	return Boolean(node.elements.at(index));
};

const isSafeStaticMemberObject = (node, propertyName, context, visitedVariables) => {
	const definition = getConstVariableDefinition(node, context);
	let primitiveValue;
	if (node.type === 'Literal') {
		primitiveValue = node.value;
	} else if (definition?.initializer.type === 'Literal') {
		primitiveValue = definition.initializer.value;
	}

	if (typeof primitiveValue === 'string') {
		if (propertyName === 'length') {
			return true;
		}

		const index = Number(propertyName);
		return String(index) === propertyName && index >= 0 && index < primitiveValue.length;
	}

	if (node.type === 'ArrayExpression') {
		return isSafeStaticArrayMember(node, propertyName, context, visitedVariables);
	}

	if (node.type === 'ObjectExpression') {
		return isSafeStaticObjectMember(node, propertyName, context, visitedVariables);
	}

	return false;
};

const isSafeStaticMember = (node, context, visitedVariables) => {
	const propertyName = getStaticMemberName(node, context);
	if (node.computed && hasPotentiallyMutableMemberAccess(node.property, context, visitedVariables)) {
		return false;
	}

	return isSafeStaticMemberObject(node.object, propertyName, context, visitedVariables);
};

const getChildNodes = node => Object.entries(node)
	.filter(([key]) =>
		!['parent', 'loc', 'range'].includes(key)
		&& !(node.type === 'Property' && key === 'key' && !node.computed),
	)
	.flatMap(([, value]) => Array.isArray(value) ? value : [value])
	.filter(value => value?.type);

export const hasPotentiallyMutableMemberAccess = (node, context, visitedVariables = new Set()) => {
	node = unwrapTypeScriptExpression(node);
	if (node.type === 'ChainExpression') {
		node = node.expression;
	}

	const definition = getConstVariableDefinition(node, context);
	if (definition) {
		if (visitedVariables.has(definition.variable)) {
			return true;
		}

		visitedVariables.add(definition.variable);
		const result = hasPotentiallyMutableMemberAccess(definition.initializer, context, visitedVariables);
		visitedVariables.delete(definition.variable);
		return result;
	}

	if (node.type === 'MemberExpression') {
		return !isSafeStaticMember(node, context, visitedVariables);
	}

	return getChildNodes(node).some(child => hasPotentiallyMutableMemberAccess(child, context, visitedVariables));
};

/**
Get the static value of a node only when evaluating it has no side effects or unsupported mutable member reads.

@param {import('estree').Node} node
@param {import('eslint').Rule.RuleContext} context
@returns {object | undefined}
*/
export default function getStaticValueIfNoSideEffects(node, context) {
	node = unwrapTypeScriptExpression(node);
	const {sourceCode} = context;
	if (
		hasSideEffect(node, sourceCode)
		|| hasPotentiallyMutableMemberAccess(node, context)
	) {
		return;
	}

	return getStaticValueFromEslintUtilities(node, sourceCode.getScope(node)) ?? undefined;
}
