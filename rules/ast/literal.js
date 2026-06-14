export function isLiteral(node, value) {
	if (node?.type !== 'Literal') {
		return false;
	}

	return node.value === value;
}

export const isStringLiteral = node => node?.type === 'Literal' && typeof node.value === 'string';

export const isBooleanLiteral = (node, value) =>
	node?.type === 'Literal'
	&& typeof node.value === 'boolean'
	&& (value === undefined || node.value === value);

export const getStaticStringValue = node => {
	if (isStringLiteral(node)) {
		return node.value;
	}

	if (
		node?.type === 'TemplateLiteral'
		&& node.expressions.length === 0
	) {
		return node.quasis[0].value.cooked;
	}
};

export const isNumericLiteral = node => node.type === 'Literal' && typeof node.value === 'number';

export const isRegexLiteral = node => node.type === 'Literal' && Boolean(node.regex);

export const isNullLiteral = node => node?.type === 'Literal' && node.raw === 'null';

export const isBigIntLiteral = node => node.type === 'Literal' && Boolean(node.bigint);

export const isEmptyStringLiteral = node => isLiteral(node, '');
