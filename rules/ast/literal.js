export function isLiteral(node, value) {
	if (node?.type !== 'Literal') {
		return false;
	}

	return node.value === value;
}

export const isStringLiteral = node => node?.type === 'Literal' && typeof node.value === 'string';

export const isNumericLiteral = node => node.type === 'Literal' && typeof node.value === 'number';

export const isRegexLiteral = node => node.type === 'Literal' && Boolean(node.regex);

export const isNullLiteral = node => node?.type === 'Literal' && node.raw === 'null';

export const isBigIntLiteral = node => node.type === 'Literal' && Boolean(node.bigint);

export const isEmptyStringLiteral = node => isLiteral(node, '');
