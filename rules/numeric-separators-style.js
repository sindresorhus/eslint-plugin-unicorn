'use strict';
const {chunk, last} = require('lodash');
const getDocumentationUrl = require('./utils/get-documentation-url');
const getNumberLiteralType = require('./utils/get-number-literal-type');

const defaultOptions = {
	hexadecimal: {minimumThreshold: 0, preferedGroupLength: 2},
	binary: {minimumThreshold: 0, preferedGroupLength: 4},
	octal: {minimumThreshold: 0, preferedGroupLength: 4},
	bigint: {minimumThreshold: 5, preferedGroupLength: 3},
	number: {minimumThreshold: 5, preferedGroupLength: 3}
};

const literalNotations = {
	hexadecimal: '0x',
	binary: '0b',
	octal: '0o',
	bigint: 'n',
	number: ''
};

function isLegacyOctal(node) {
	return getNumberLiteralType(node) === 'number' && node.raw.startsWith('0');
}

const chunkString = (string, size) => chunk(string, size).map(elt => elt.join(''));

function addLiteralNotation(notation, string) {
	if (notation === '') {
		return string;
	}

	return notation === 'n' ?
		string + notation :
		notation + string;
}

function removeLiteralNotation(notation, string) {
	if (notation === '') {
		return string;
	}

	return notation === 'n' ?
		string.replace(new RegExp(notation + '$'), '') :
		string.replace(notation, '');
}

function getChunks(string, size, restAtEnd) {
	let chunks = chunkString(string, size);
	const lastElement = last(chunks);
	if (restAtEnd || chunks.length === 1 || lastElement.length === size) {
		return chunks;
	}

	// Put the rest of the number, currently at the end, at the beginning
	const offset = '0'.repeat(size - lastElement.length);
	string = offset + string;
	chunks = chunkString(string, size);
	chunks[0] = chunks[0].replace(offset, '');
	return chunks;
}

function parseNumber(string) {
	const groups = string.split(/(?=\.|e)/);
	const wholePart = groups.find(grp => !grp.startsWith('.') && !grp.startsWith('e'));
	const decimalPart = groups.find(grp => grp.startsWith('.'));
	const powerPart = groups.find(grp => grp.startsWith('e'));
	return {
		wholePart,
		decimalPart: decimalPart ? decimalPart.slice(1) : undefined,
		powerPart: powerPart ? powerPart.slice(1) : undefined
	};
}

function getFixedValue(notation, string, {minimumThreshold, preferedGroupLength}) {
	string = removeLiteralNotation(notation, string);
	const {wholePart, decimalPart, powerPart} = parseNumber(string);
	const numberGroups = [];
	const powerGroups = [];

	if (wholePart) {
		if (wholePart.length < minimumThreshold) {
			numberGroups[0] = [wholePart];
		} else if (wholePart.endsWith('n')) {
			numberGroups[0] = getChunks(wholePart.replace('n', ''), preferedGroupLength, false);
			numberGroups[0][numberGroups[0].length - 1] += 'n';
		} else {
			numberGroups[0] = getChunks(wholePart, preferedGroupLength, false);
		}
	}

	if (decimalPart) {
		numberGroups[1] = getChunks(decimalPart, preferedGroupLength, true);
	}

	if (powerPart) {
		if (powerPart.replace('-', '').length < minimumThreshold) {
			powerGroups.push(powerPart);
		} else if (powerPart.startsWith('-')) {
			powerGroups.push(...getChunks(powerPart.replace('-', ''), preferedGroupLength, false));
			powerGroups[0] = '-' + powerGroups[0];
		} else {
			powerGroups.push(...getChunks(powerPart, preferedGroupLength, false));
		}
	}

	const base = numberGroups.map(part => part.join('_')).join('.');

	const power = powerGroups.length > 0 ? 'e' + powerGroups.join('_') : '';
	return addLiteralNotation(notation, base + power);
}

const create = context => ({
	Literal: node => {
		if ((typeof node.value === 'number' || node.bigint) && !isLegacyOctal(node)) {
			const literalType = getNumberLiteralType(node);
			const options = context.options[0] ? context.options[0][literalType] : defaultOptions[literalType];

			const notation = literalNotations[literalType];
			const unseparated = node.raw.replace(/_/g, '');
			const fixed = getFixedValue(notation, unseparated, options);

			if (node.raw !== fixed) {
				context.report({
					node,
					message: 'Invalid group length in numeric value.',
					fix: fixer => fixer.replaceText(node, fixed)
				});
			}
		}
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	}
};
