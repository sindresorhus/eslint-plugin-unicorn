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

const staticGlobalProperties = new Map([
	['Math', new Set(['E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'PI', 'SQRT1_2', 'SQRT2'])],
	['Number', new Set(['EPSILON', 'MAX_SAFE_INTEGER', 'MAX_VALUE', 'MIN_SAFE_INTEGER', 'MIN_VALUE', 'NaN', 'NEGATIVE_INFINITY', 'POSITIVE_INFINITY'])],
	['String', new Set(['raw'])],
	['Symbol', new Set(['asyncIterator', 'hasInstance', 'isConcatSpreadable', 'iterator', 'match', 'matchAll', 'replace', 'search', 'species', 'split', 'toPrimitive', 'toStringTag', 'unscopables'])],
]);

// Like `getStaticValue`, this assumes that built-in globals are not monkey-patched.
const isSafeStaticGlobalMember = (node, context) =>
	Boolean(
		node.type === 'MemberExpression'
		&& !node.optional
		&& node.object.type === 'Identifier'
		&& isGlobalIdentifier(node.object, context)
		&& staticGlobalProperties.get(node.object.name)?.has(
			node.computed
				? node.property.type === 'Literal' && typeof node.property.value === 'string' && node.property.value
				: node.property.type === 'Identifier' && node.property.name,
		),
	);

export const isSafeStaticPassThroughCall = (node, context, visitedVariables = new Set()) => {
	node = unwrapTypeScriptExpression(node);
	if (node.type !== 'CallExpression') {
		return false;
	}

	const callee = unwrapTypeScriptExpression(node.callee);
	const object = unwrapTypeScriptExpression(callee.object);

	return !node.optional
		&& node.arguments.length === 1
		&& node.arguments[0].type !== 'SpreadElement'
		&& callee.type === 'MemberExpression'
		&& !callee.computed
		&& !callee.optional
		&& object.type === 'Identifier'
		&& object.name === 'Object'
		&& isGlobalIdentifier(object, context)
		&& callee.property.type === 'Identifier'
		&& staticPassThroughMethods.has(callee.property.name)
		&& getStaticValueIfNoSideEffectsInternal(node.arguments[0], context, visitedVariables) !== undefined;
};

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
		|| ['bigint', 'boolean', 'number', 'string', 'undefined'].includes(typeof staticValue.value);
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

export const hasPotentiallyMutableBinding = (node, context, visitedVariables = new Set()) => {
	if (node.type === 'Identifier') {
		const variable = findVariable(context.sourceCode.getScope(node), node);
		const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
		if (definition?.type !== 'Variable') {
			return false;
		}

		if (definition.parent?.kind !== 'const') {
			return true;
		}

		if (!definition.node.init || visitedVariables.has(variable)) {
			return false;
		}

		visitedVariables.add(variable);
		const result = hasPotentiallyMutableBinding(definition.node.init, context, visitedVariables);
		visitedVariables.delete(variable);
		return result;
	}

	if (unevaluatedExpressionTypes.has(node.type)) {
		return false;
	}

	return getChildNodes(node).some(child => hasPotentiallyMutableBinding(child, context, visitedVariables));
};

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
		!isSafeStaticPassThroughCall(definition.initializer, context, visitedVariables)
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

	if (isSafeStaticPassThroughCall(node, context, visitedVariables)) {
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
		return !isSafeStaticGlobalMember(node, context)
			&& !isSafeStaticMember(node, context, visitedVariables);
	}

	return getChildNodes(node).some(child => hasPotentiallyMutableMemberAccess(child, context, visitedVariables));
};

const hasPotentiallyMutableBindingInEvaluatedPath = (node, context, visitedVariables = new Set()) => {
	node = unwrapTypeScriptExpression(node);

	if (node.type === 'Identifier') {
		const variable = findVariable(context.sourceCode.getScope(node), node);
		const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
		if (definition?.type !== 'Variable') {
			return false;
		}

		if (definition.parent?.kind !== 'const') {
			return true;
		}

		if (!definition.node.init || visitedVariables.has(variable)) {
			return false;
		}

		visitedVariables.add(variable);
		const result = hasPotentiallyMutableBindingInEvaluatedPath(definition.node.init, context, visitedVariables);
		visitedVariables.delete(variable);
		return result;
	}

	if (node.type === 'ConditionalExpression') {
		if (hasPotentiallyMutableBindingInEvaluatedPath(node.test, context, visitedVariables)) {
			return true;
		}

		const staticValue = getStaticValueIfNoSideEffectsInternal(node.test, context, visitedVariables);
		if (staticValue !== undefined) {
			return hasPotentiallyMutableBindingInEvaluatedPath(
				staticValue.value ? node.consequent : node.alternate,
				context,
				visitedVariables,
			);
		}

		return hasPotentiallyMutableBindingInEvaluatedPath(node.consequent, context, visitedVariables)
			|| hasPotentiallyMutableBindingInEvaluatedPath(node.alternate, context, visitedVariables);
	}

	if (node.type === 'LogicalExpression') {
		if (hasPotentiallyMutableBindingInEvaluatedPath(node.left, context, visitedVariables)) {
			return true;
		}

		const staticValue = getStaticValueIfNoSideEffectsInternal(node.left, context, visitedVariables);
		if (staticValue !== undefined) {
			let evaluatesRight;
			if (node.operator === '&&') {
				evaluatesRight = Boolean(staticValue.value);
			} else if (node.operator === '||') {
				evaluatesRight = !staticValue.value;
			} else {
				evaluatesRight = staticValue.value === null || staticValue.value === undefined;
			}

			return evaluatesRight
				&& hasPotentiallyMutableBindingInEvaluatedPath(node.right, context, visitedVariables);
		}

		return hasPotentiallyMutableBindingInEvaluatedPath(node.right, context, visitedVariables);
	}

	if (node.type === 'SequenceExpression') {
		return node.expressions.some(expression => hasPotentiallyMutableBindingInEvaluatedPath(expression, context, visitedVariables));
	}

	if (unevaluatedExpressionTypes.has(node.type)) {
		return false;
	}

	return getChildNodes(node).some(child => hasPotentiallyMutableBindingInEvaluatedPath(child, context, visitedVariables));
};

const getStaticValueIfNoSideEffectsInternal = (node, context, visitedVariables = new Set()) => {
	node = unwrapTypeScriptExpression(node);
	const {sourceCode} = context;

	// Static evaluation can execute allowlisted built-ins, so reject side-effectful expressions and constant initializers before they can perform expensive work.
	const hasSideEffects = hasSideEffect(node, sourceCode);
	if (
		(hasSideEffects && !isSafeStaticPassThroughCall(node, context, visitedVariables))
		|| hasSideEffectfulConstInitializer(node, context, visitedVariables)
	) {
		return;
	}

	// Most expressions have no static value at all, so evaluate first and only run the expensive mutability walk when there is a value to protect.
	const staticValue = getStaticValueFromEslintUtilities(node, sourceCode.getScope(node));
	if (!staticValue) {
		return;
	}

	if (hasPotentiallyMutableMemberAccess(node, context, visitedVariables)) {
		return;
	}

	return staticValue;
};

// `getStaticValue` is not flow-sensitive, so reject mutable bindings on any path that can be evaluated.
export const getStaticValueForControlFlow = (node, context) => {
	const staticValue = getStaticValueIfNoSideEffectsInternal(node, context);
	return staticValue !== undefined && !hasPotentiallyMutableBindingInEvaluatedPath(node, context)
		? staticValue
		: undefined;
};

/**
Get the static value of a node only when evaluating it has no side effects or unsupported mutable member reads.

@param {import('estree').Node} node
@param {import('eslint').Rule.RuleContext} context
@returns {object | undefined}
*/
export default function getStaticValueIfNoSideEffects(node, context) {
	return getStaticValueIfNoSideEffectsInternal(node, context);
}
