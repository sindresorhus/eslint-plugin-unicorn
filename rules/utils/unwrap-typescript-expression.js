const typeScriptExpressionWrapperTypes = new Set([
	'TSAsExpression',
	'TSSatisfiesExpression',
	'TSNonNullExpression',
	'TSTypeAssertion',
]);

export const isTypeScriptExpressionWrapper = node => typeScriptExpressionWrapperTypes.has(node?.type);

export default function unwrapTypeScriptExpression(node) {
	while (isTypeScriptExpressionWrapper(node)) {
		node = node.expression;
	}

	return node;
}
