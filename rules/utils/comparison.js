import isSameReference from './is-same-reference.js';

const typeScriptExpressionNodeTypes = new Set([
	'TSAsExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
	'TSNonNullExpression',
]);

const optionalChainNodeTypes = new Set([
	'CallExpression',
	'MemberExpression',
]);

const referenceNodeTypes = new Set([
	'Identifier',
	'MemberExpression',
	'Super',
	'ThisExpression',
]);

/**
Unwrap TypeScript type-only expression wrappers (`as`, `satisfies`, `<Type>`, and `!`), which have no runtime effect.

@param {import('estree').Node} node The node to unwrap.
@returns {import('estree').Node} The unwrapped node.
*/
export const unwrapExpression = node =>
	typeScriptExpressionNodeTypes.has(node.type)
		? unwrapExpression(node.expression)
		: node;

const normalizeReference = node => {
	node = unwrapExpression(node);

	if (node.type === 'MemberExpression') {
		return {
			...node,
			object: normalizeReference(node.object),
			property: node.computed ? normalizeReference(node.property) : node.property,
		};
	}

	return node;
};

/**
Check if two nodes reference the same value, ignoring TypeScript type-only wrappers.

@param {import('estree').Node} left The first node to compare.
@param {import('estree').Node} right The second node to compare.
@returns {boolean} `true` if both nodes reference the same value.
*/
export const isSame = (left, right) =>
	isSameReference(normalizeReference(left), normalizeReference(right));

/**
Check if a node is a reference (identifier, member access, `this`, or `super`), ignoring TypeScript type-only wrappers.

@returns {boolean} `true` if the node is a reference.
*/
export const isReference = node => referenceNodeTypes.has(unwrapExpression(node).type);

/**
Check if a node contains optional chaining (`?.`) anywhere within it, which is not safe to reason about as a plain reference.

@returns {boolean} `true` if the node contains optional chaining.
*/
export const containsOptionalChain = node => {
	if (node.type === 'ChainExpression') {
		return true;
	}

	if (optionalChainNodeTypes.has(node.type) && node.optional) {
		return true;
	}

	return Object.entries(node).some(([key, value]) => {
		if (key === 'parent' || !value) {
			return false;
		}

		if (Array.isArray(value)) {
			return value.some(element => element?.type && containsOptionalChain(element));
		}

		return value.type && containsOptionalChain(value);
	});
};
