'use strict';
const {chunk, last} = require('lodash');
const getDocumentationUrl = require('./utils/get-documentation-url');
const getNumberLiteralType = require('./utils/get-number-literal-type');

function isLegacyOctal(node) {
	return getNumberLiteralType(node) === 'number' && node.raw.startsWith('0');
}

function hasPrefix(raw) {
	const rawLower = raw.toLowerCase();
	return rawLower.startsWith('0x') || rawLower.startsWith('0b') || rawLower.startsWith('0o');
}

const chunkString = (string, size) => chunk(string, size).map(elt => elt.join(''));

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

function format(string, options, restAtEnd) {
	if (string.includes('.')) {
		const [lhs, rhs] = string.split('.');
		const formattedLhs = lhs.length > 0 ? format(lhs, options, false) : '';
		const formattedRhs = format(rhs, options, true);
		return `${formattedLhs}.${formattedRhs}`;
	}

	if (string.startsWith('-') || string.startsWith('+')) {
		const sign = string.slice(0, 1);
		const numberPart = string.slice(1);
		return sign + format(numberPart, options, restAtEnd);
	}

	if (string.length >= options.minimumDigits) {
		return getChunks(string, options.preferedGroupLength, restAtEnd).join('_');
	}

	return string;
}

function getFixedValue(raw, node, options) {
	if (node.bigint) {
		raw = raw.replace('n', '');
	}

	let final = '';

	if (hasPrefix(raw)) {
		const prefix = raw.slice(0, 2);
		const dataPart = raw.slice(2);
		const formatted = format(dataPart, options, false);
		final = prefix + formatted;
	} else {
		const [numberPart, powerPart] = raw.split(/e|E/);
		if (powerPart) {
			const exp = raw.includes('E') ? 'E' : 'e';
			final = format(numberPart, options, false) + exp + format(powerPart, options, false);
		} else {
			final = format(numberPart, options, false);
		}
	}

	return node.bigint ? final + 'n' : final;
}

const create = context => ({
	Literal: node => {
		if ((typeof node.value === 'number' || node.bigint) && !isLegacyOctal(node)) {
			const literalType = getNumberLiteralType(node) === 'bigint' ? 'number' : getNumberLiteralType(node);
			const options = context.options[0][literalType];

			const unseparated = node.raw.replace(/_/g, '');
			const fixed = getFixedValue(unseparated, node, options);

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

function getProperties(minimumDigits, preferedGroupLength) {
	return {
		type: 'object',
		properties: {
			minimumDigits: {
				type: 'number',
				default: minimumDigits
			},
			preferedGroupLength: {
				type: 'number',
				default: preferedGroupLength
			}
		}
	};
}

const schema = [{
	type: 'object',
	properties: {
		hexadecimal: getProperties(0, 2),
		binary: getProperties(0, 4),
		octal: getProperties(0, 4),
		number: getProperties(5, 3)
	}
}];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema
	}
};
