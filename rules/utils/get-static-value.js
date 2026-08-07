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

const isSafeStaticMemberObject = (node, context, visitedVariables) => {
	if (node.type === 'Literal' && (node.regex || typeof node.value !== 'object')) {
		return true;
	}

	if (node.type === 'Identifier' && context) {
		const variable = findVariable(context.sourceCode.getScope(node), node);
		const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
		const initializer = definition?.type === 'Variable'
			&& definition.parent?.kind === 'const'
			&& definition.node.id === definition.name
			? definition.node.init
			: undefined;

		if (initializer?.type === 'Literal' && initializer.regex) {
			return true;
		}
	}

	if (node.type === 'ArrayExpression') {
		return node.elements.every(element =>
			!element
			|| (
				element.type !== 'SpreadElement'
				&& !hasPotentiallyMutableMemberAccess(element, context, visitedVariables)
			),
		);
	}

	if (node.type === 'ObjectExpression') {
		return node.properties.every(property =>
			property.type === 'Property'
			&& !property.computed
			&& property.kind === 'init'
			&& !property.method
			&& property.key.name !== '__proto__'
			&& property.key.value !== '__proto__'
			&& !hasPotentiallyMutableMemberAccess(property.value, context, visitedVariables),
		);
	}

	return false;
};

const getChildNodes = node => Object.entries(node)
	.filter(([key]) => !['parent', 'loc', 'range'].includes(key))
	.flatMap(([, value]) => Array.isArray(value) ? value : [value])
	.filter(value => value?.type);

export const hasPotentiallyMutableMemberAccess = (node, context, visitedVariables = new Set()) => {
	node = unwrapTypeScriptExpression(node);
	if (node.type === 'ChainExpression') {
		node = node.expression;
	}

	if (node.type === 'Identifier' && context) {
		const variable = findVariable(context.sourceCode.getScope(node), node);
		const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
		if (
			definition?.type === 'Variable'
			&& definition.parent?.kind === 'const'
			&& definition.node.id === definition.name
			&& definition.node.init
		) {
			if (visitedVariables.has(variable)) {
				return true;
			}

			visitedVariables.add(variable);
			const result = hasPotentiallyMutableMemberAccess(definition.node.init, context, visitedVariables);
			visitedVariables.delete(variable);
			return result;
		}
	}

	if (node.type === 'MemberExpression') {
		if (!isSafeStaticMemberObject(node.object, context, visitedVariables)) {
			return true;
		}

		return node.computed && hasPotentiallyMutableMemberAccess(node.property, context, visitedVariables);
	}

	return getChildNodes(node).some(child => hasPotentiallyMutableMemberAccess(child, context, visitedVariables));
};

/**
Get the static value of a node only when evaluating it has no side effects, including getter-backed member reads.

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
