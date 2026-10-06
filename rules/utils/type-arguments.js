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
