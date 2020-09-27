'use strict';

const getDocumentationUrl = require('./utils/get-documentation-url');

function addSeparator(value, {minimumDigits, preferedGroupLength}, fromLeft) {
	const {length} = value;

	if (length < minimumDigits) {
		return value;
	}

	const parts = [];
	if (fromLeft) {
		for (let start = 0; start < length; start += preferedGroupLength) {
			const end = Math.min(start + preferedGroupLength, length);
			parts.push(value.slice(start, end));
		}
	} else {
		for (let end = length; end > 0; end -= preferedGroupLength) {
			const start = Math.max(end - preferedGroupLength, 0);
			parts.unshift(value.slice(start, end));
		}
	}

	return parts.join('_');
}

function addSeparatorFromLeft(value, options) {
	return addSeparator(value, options, true);
}

function formatNumber(value, options) {
	const parts = value.split('.');
	const [decimal, fractional] = parts;

	let formatted = addSeparator(decimal, options);
	if (parts.length === 2) {
		formatted += '.';
		formatted += addSeparatorFromLeft(fractional, options);
	}

	return formatted;
}

function format(value, options) {
	const {
		prefix = '',
		data
	} = value.match(/^(?<prefix>0[box])?(?<data>.*)$/i).groups;

	const formatOption = options[prefix.toLowerCase()];

	if (prefix) {
		return prefix + addSeparator(data, formatOption);
	}

	const {
		number,
		mark = '',
		sign = '',
		power = ''
	} = value.match(/^(?<number>.*?)(?:(?<mark>e)(?<sign>[-+]?)?(?<power>\d+))?$/i).groups;

	return formatNumber(number, formatOption) + mark + sign + addSeparator(power, options['']);
}

const create = context => {
	const [rawOptions] = context.options;
	const options = {
		'0b': rawOptions.binary,
		'0o': rawOptions.octal,
		'0x': rawOptions.hexadecimal,
		'': rawOptions.number
	};

	return {
		Literal: node => {
			const {value, bigint, raw} = node;
			let number = raw;
			let suffix = '';
			if (typeof value === 'number') {
				// Legacy octal
				if (/^0\d+$/.test(raw)) {
					return;
				}
			} else if (bigint) {
				number = raw.slice(0, -1);
				suffix = 'n';
			} else {
				return;
			}

			const fixed = format(number.replace(/_/g, ''), options) + suffix;

			if (raw !== fixed) {
				context.report({
					node,
					message: 'Invalid group length in numeric value.',
					fix: fixer => fixer.replaceText(node, fixed)
				});
			}
		}
	};
};

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
		},
		additionalProperties: false
	};
}

const schema = [{
	type: 'object',
	properties: {
		hexadecimal: getProperties(0, 2),
		binary: getProperties(0, 4),
		octal: getProperties(0, 4),
		number: getProperties(5, 3)
	},
	additionalProperties: false
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
