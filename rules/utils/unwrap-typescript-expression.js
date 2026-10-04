const typeScriptExpressionWrapperTypes = new Set([
	'TSAsExpression',
	'TSSatisfiesExpression',
	'TSNonNullExpression',
	'TSTypeAssertion',
	'TSInstantiationExpression',
]);

/**
Check if the node is a TypeScript expression wrapper (`as`, `satisfies`, `!`, `<Type>`, or `foo<Type>`) that has no runtime effect.

@param {import('estree').Node} node
@returns {boolean}
*/
export const isTypeScriptExpressionWrapper = node => typeScriptExpressionWrapperTypes.has(node?.type);

/**
Unwrap TypeScript expression wrappers (`as`, `satisfies`, `!`, `<Type>`, and `foo<Type>`), which have no runtime effect.

@param {import('estree').Node} node
@returns {import('estree').Node}
*/
export default function unwrapTypeScriptExpression(node) {
	while (isTypeScriptExpressionWrapper(node)) {
		node = node.expression;
	}

	return node;
}

/**
Unwrap `ChainExpression` (`foo?.bar`) and TypeScript expression wrapper nodes.

Only use this when the short-circuiting of an optional chain does not matter.

@param {import('estree').Node} node
@returns {import('estree').Node}
*/
export function unwrapChainAndTypeScriptExpression(node) {
	while (node?.type === 'ChainExpression' || isTypeScriptExpressionWrapper(node)) {
		node = node.expression;
	}

	return node;
}

/**
Get the outermost TypeScript expression wrapper (`as`, `satisfies`, `!`, `<Type>`, or `foo<Type>`) around `node`. This is the upward counterpart of `unwrapTypeScriptExpression`.

Returns `node` itself when it has no wrapper.

@param {import('estree').Node} node
@returns {import('estree').Node}
*/
export function getOutermostTypeScriptExpression(node) {
	while (
		isTypeScriptExpressionWrapper(node.parent)
		&& node.parent.expression === node
	) {
		node = node.parent;
	}

	return node;
}

/**
Get the outermost `ChainExpression` (`foo?.bar`) or TypeScript expression wrapper around `node`. This is the upward counterpart of `unwrapChainAndTypeScriptExpression`.

Returns `node` itself when it has no wrapper.

@param {import('estree').Node} node
@returns {import('estree').Node}
*/
export function getOutermostChainAndTypeScriptExpression(node) {
	while (
		(node.parent?.type === 'ChainExpression' || isTypeScriptExpressionWrapper(node.parent))
		&& node.parent.expression === node
	) {
		node = node.parent;
	}

	return node;
}
