import unwrapTypeScriptExpression from './unwrap-typescript-expression.js';

/**
Get a primitive literal value, including expression-free templates and signed numeric literals. Returns `undefined` for other expressions.

@param {import('estree').Node} node
@returns {string | number | bigint | boolean | null | undefined}
*/
export default function getPrimitiveLiteralValue(node) {
	node = unwrapTypeScriptExpression(node);
	if (!node) {
		return;
	}

	if (node.type === 'Literal' && !node.regex) {
		return node.value;
	}

	if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
		return node.quasis[0].value.cooked;
	}

	if (node.type !== 'UnaryExpression') {
		return;
	}

	const argument = unwrapTypeScriptExpression(node.argument);
	if (argument.type !== 'Literal') {
		return;
	}

	if (typeof argument.value === 'number' && (node.operator === '-' || node.operator === '+')) {
		return node.operator === '-' ? -argument.value : argument.value;
	}

	if (typeof argument.value === 'bigint' && node.operator === '-') {
		return -argument.value;
	}
}
