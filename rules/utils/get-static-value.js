import {
	findVariable,
	getStaticValue as getStaticValueFromEslintUtilities,
	hasSideEffect,
} from '@eslint-community/eslint-utils';
import isGlobalIdentifier from './is-global-identifier.js';
import unwrapTypeScriptExpression from './unwrap-typescript-expression.js';

const unevaluatedExpressionTypes = new Set([
	'FunctionExpression',
	'ArrowFunctionExpression',
	'ClassExpression',
]);

const staticPassThroughMethods = new Set([
	'freeze',
	'preventExtensions',
	'seal',
]);

const isSafeStaticPassThroughCall = (node, context) =>
	node.type === 'CallExpression'
	&& !node.optional
	&& node.arguments.length === 1
	&& node.arguments[0].type !== 'SpreadElement'
	&& node.callee.type === 'MemberExpression'
	&& !node.callee.computed
	&& !node.callee.optional
	&& node.callee.object.type === 'Identifier'
	&& node.callee.object.name === 'Object'
	&& isGlobalIdentifier(node.callee.object, context)
	&& node.callee.property.type === 'Identifier'
	&& staticPassThroughMethods.has(node.callee.property.name)
	&& getStaticValueIfNoSideEffects(node.arguments[0], context) !== undefined;

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

const isRegExpValue = value => Object.prototype.toString.call(value) === '[object RegExp]';

const isRegExpConstructor = node => node?.type === 'NewExpression'
	&& node.callee.type === 'Identifier'
	&& node.callee.name === 'RegExp';

const isRegExpLiteral = node => node?.type === 'Literal' && node.regex;

const getRegExpVariableDefinition = (node, context) => {
	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
	if (
		definition?.type !== 'Variable'
		|| !definition.node.init
		|| definition.node.id !== definition.name
		|| variable.references.some(reference => reference.isWrite() && reference.identifier !== definition.name)
	) {
		return;
	}

	return {initializer: definition.node.init};
};

const isSafeStaticRegExpConstructorArgument = (node, context) => {
	if (node.type === 'SpreadElement') {
		return false;
	}

	const staticValue = getStaticValueIfNoSideEffects(node, context);
	if (!staticValue) {
		return false;
	}

	return isRegExpValue(staticValue.value)
		|| staticValue.value === null
		|| ['bigint', 'boolean', 'number', 'string', 'symbol', 'undefined'].includes(typeof staticValue.value);
};

export const getStaticRegExp = (node, context) => {
	const staticValue = getStaticValueIfNoSideEffects(node, context);
	if (staticValue && isRegExpValue(staticValue.value)) {
		return staticValue.value;
	}

	const definition = getRegExpVariableDefinition(node, context);
	const initializer = definition?.initializer;
	const constructor = isRegExpConstructor(node)
		? node
		: (isRegExpConstructor(initializer) ? initializer : undefined);
	if (
		!isRegExpLiteral(initializer)
		&& (!constructor || constructor.arguments.some(argument => !isSafeStaticRegExpConstructorArgument(argument, context)))
	) {
		return;
	}

	const result = getStaticValueFromEslintUtilities(node, context.sourceCode.getScope(node));
	return result && isRegExpValue(result.value) ? result.value : undefined;
};

const getChildNodes = node => Object.entries(node)
	.filter(([key]) =>
		!['parent', 'loc', 'range'].includes(key)
		&& !(node.type === 'Property' && key === 'key' && !node.computed)
		&& !(node.type === 'MemberExpression' && key === 'property' && !node.computed),
	)
	.flatMap(([, value]) => Array.isArray(value) ? value : [value])
	.filter(value => value?.type);

const hasSideEffectfulConstReference = (node, context, visitedVariables) => {
	if (node.type === 'Identifier') {
		return hasSideEffectfulConstInitializer(node, context, visitedVariables);
	}

	if (unevaluatedExpressionTypes.has(node.type)) {
		return false;
	}

	return getChildNodes(node).some(child => hasSideEffectfulConstReference(child, context, visitedVariables));
};

export const hasSideEffectfulConstInitializer = (node, context, visitedVariables = new Set()) => {
	const definition = getConstVariableDefinition(node, context);
	if (!definition) {
		return node.type !== 'Identifier'
			&& hasSideEffectfulConstReference(node, context, visitedVariables);
	}

	if (visitedVariables.has(definition.variable)) {
		return true;
	}

	visitedVariables.add(definition.variable);
	const result = (
		!isSafeStaticPassThroughCall(definition.initializer, context)
		&& hasSideEffect(definition.initializer, context.sourceCode, {considerGetters: true})
	) || hasSideEffectfulConstReference(definition.initializer, context, visitedVariables);
	visitedVariables.delete(definition.variable);
	return result;
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
	if (String(index) !== propertyName || !Number.isSafeInteger(index) || index < 0 || index >= node.elements.length) {
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
		return String(index) === propertyName
			&& Number.isSafeInteger(index)
			&& index >= 0
			&& index < primitiveValue.length;
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

export const hasPotentiallyMutableMemberAccess = (node, context, visitedVariables = new Set()) => {
	node = unwrapTypeScriptExpression(node);
	if (node.type === 'ChainExpression') {
		node = node.expression;
	}

	if (isSafeStaticPassThroughCall(node, context)) {
		return false;
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
	const hasSideEffects = hasSideEffect(node, sourceCode);
	if (
		(!isSafeStaticPassThroughCall(node, context) && hasSideEffects)
		|| hasSideEffectfulConstInitializer(node, context)
		|| hasPotentiallyMutableMemberAccess(node, context)
	) {
		return;
	}

	return getStaticValueFromEslintUtilities(node, sourceCode.getScope(node)) ?? undefined;
}
