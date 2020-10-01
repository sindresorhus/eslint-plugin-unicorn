'use strict';
const {defaultsDeep, fromPairs} = require('lodash');
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'numeric-separators-style';
const messages = {
	[MESSAGE_ID]: 'Invalid group length in numeric value.'
};

function addSeparator(value, {minimumDigits, groupLength}, fromLeft) {
	const {length} = value;

	if (length < minimumDigits) {
		return value;
	}

	const parts = [];
	if (fromLeft) {
		for (let start = 0; start < length; start += groupLength) {
			const end = Math.min(start + groupLength, length);
			parts.push(value.slice(start, end));
		}
	} else {
		for (let end = length; end > 0; end -= groupLength) {
			const start = Math.max(end - groupLength, 0);
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
	const [integer, fractional] = parts;

	let formatted = addSeparator(integer, options);
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
	} = value.match(/^(?<number>.*?)(?:(?<mark>e)(?<sign>[+-])?(?<power>\d+))?$/i).groups;

	return formatNumber(number, formatOption) + mark + sign + addSeparator(power, options['']);
}

const defaultOptions = {
	hexadecimal: {minimumDigits: 0, groupLength: 2},
	binary: {minimumDigits: 0, groupLength: 4},
	octal: {minimumDigits: 0, groupLength: 4},
	number: {minimumDigits: 5, groupLength: 3}
};
const create = context => {
	const rawOptions = defaultsDeep({}, context.options[0], defaultOptions);
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

			const formatted = format(number.replace(/_/g, ''), options) + suffix;

			if (raw !== formatted) {
				context.report({
					node,
					messageId: MESSAGE_ID,
					fix: fixer => fixer.replaceText(node, formatted)
				});
			}
		}
	};
};

const formatOptionsSchema = ({minimumDigits, groupLength}) => ({
	type: 'object',
	properties: {
		minimumDigits: {
			type: 'integer',
			minimum: 0,
			default: minimumDigits
		},
		groupLength: {
			type: 'integer',
			minimum: 1,
			default: groupLength
		}
	},
	additionalProperties: false
});

const schema = [{
	type: 'object',
	properties: fromPairs(
		Object.entries(defaultOptions).map(([type, options]) => [type, formatOptionsSchema(options)])
	),
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
		schema,
		messages
	}
};
