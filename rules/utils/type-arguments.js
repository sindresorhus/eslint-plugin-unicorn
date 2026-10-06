import getTokenStore from './get-token-store.js';
import isSameTokens from './is-same-tokens.js';

// `typeParameters` is the name used by older `@typescript-eslint/parser` versions.
const getTypeArguments = node => node.typeArguments ?? node.typeParameters;

/**
Check if a call, `new` expression, or tagged template has explicit TypeScript type arguments, like `foo<string>()`.

@param {import('estree').Node} node
@returns {boolean}
*/
export function hasTypeArguments(node) {
	return Boolean(getTypeArguments(node));
}

/**
Get the source text of the explicit TypeScript type arguments of a call, `new` expression, or tagged template, like `<string>` in `foo<string>()`, or an empty string if there are none.

@param {import('estree').Node} node
@param {import('eslint').Rule.RuleContext} context
@returns {string}
*/
export function getTypeArgumentsText(node, context) {
	const typeArguments = getTypeArguments(node);
	return typeArguments ? context.sourceCode.getText(typeArguments) : '';
}

/**
Check if two expressions have the same explicit TypeScript type arguments, ignoring whitespace and comments. Expressions without type arguments match each other.

@param {import('estree').Node} left
@param {import('estree').Node} right
@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export function hasSameTypeArguments(left, right, context) {
	const leftTypeArguments = getTypeArguments(left);
	const rightTypeArguments = getTypeArguments(right);

	if (!leftTypeArguments || !rightTypeArguments) {
		return !leftTypeArguments && !rightTypeArguments;
	}

	return isSameTokens(
		getTokenStore(context, left).getTokens(leftTypeArguments),
		getTokenStore(context, right).getTokens(rightTypeArguments),
	);
}
