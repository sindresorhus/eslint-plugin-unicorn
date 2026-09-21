const MESSAGE_ID = 'no-loss-of-precision';
const messages = {
	[MESSAGE_ID]: 'This numeric literal loses precision when represented as an IEEE 754 binary64 value.',
};

/*
The precision comparison below is adapted from https://github.com/eslint/eslint/blob/v10.11.0/lib/rules/no-loss-of-precision.js

Copyright OpenJS Foundation and other contributors, <www.openjsf.org>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const removeSign = number => number[0] === '+' || number[0] === '-' ? number.slice(1) : number;

const removeLeadingZeros = number => number.replace(/^0+/u, '') || '0';

const removeTrailingZeros = number => number.replace(/0+$/u, '') || '0';

const normalizeInteger = integer => {
	const withoutLeadingZeros = removeLeadingZeros(integer);
	return {
		coefficient: removeTrailingZeros(withoutLeadingZeros),
		magnitude: withoutLeadingZeros.length - 1,
	};
};

const normalizeFloat = float => {
	const withoutLeadingZeros = removeLeadingZeros(float);
	const decimalPointIndex = withoutLeadingZeros.indexOf('.');

	if (decimalPointIndex === 0) {
		const coefficient = removeLeadingZeros(withoutLeadingZeros.slice(1));
		return {
			coefficient,
			magnitude: coefficient.length - withoutLeadingZeros.length,
		};
	}

	if (decimalPointIndex === -1) {
		return {
			coefficient: withoutLeadingZeros,
			magnitude: withoutLeadingZeros.length - 1,
		};
	}

	return {
		coefficient: withoutLeadingZeros.replace('.', ''),
		magnitude: decimalPointIndex - 1,
	};
};

const normalizeNumber = (number, parseAsFloat) => {
	const [coefficient, exponent] = number.split('e', 2);
	const normalized = parseAsFloat || coefficient.includes('.') ? normalizeFloat(coefficient) : normalizeInteger(coefficient);
	if (exponent !== undefined) {
		normalized.magnitude += Number(exponent);
	}

	return normalized;
};

const decimalLosesPrecision = (raw, value) => {
	const normalizedRaw = normalizeNumber(raw.toLowerCase().replace(/\.$/u, ''), false);
	value = Math.abs(value);

	if (value === 0) {
		return !/^0+$/u.test(normalizedRaw.coefficient);
	}

	if (!Number.isFinite(value)) {
		return true;
	}

	const requestedPrecision = normalizedRaw.coefficient.length;
	if (requestedPrecision > 100) {
		// `Number#toPrecision()` only accepts up to 100 significant digits.
		return true;
	}

	const normalizedStored = normalizeNumber(value.toPrecision(requestedPrecision), true);
	return normalizedRaw.magnitude !== normalizedStored.magnitude || normalizedRaw.coefficient !== normalizedStored.coefficient;
};

const hexadecimalLosesPrecision = (raw, value) => !raw.toLowerCase().endsWith(Math.abs(value).toString(16));

const losesPrecision = (raw, value) => {
	raw = removeSign(raw);
	if (/^(?:inf(?:inity)?|nan)$/iu.test(raw)) {
		return false;
	}

	return /^0x/iu.test(raw) ? hexadecimalLosesPrecision(raw, value) : decimalLosesPrecision(raw, value);
};

const getProblem = (node, raw, value) => {
	if (!losesPrecision(raw, value)) {
		return;
	}

	return {
		node,
		messageId: MESSAGE_ID,
	};
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('Number', node => getProblem(node, context.sourceCode.getText(node), Number(node.value)));

	context.on(['Dimension', 'Percentage'], node => getProblem(node, node.value, Number(node.value)));

	context.on('TOMLValue', node => {
		if (node.kind === 'float') {
			return getProblem(node, node.number, node.value);
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow numeric literals that lose precision when represented as IEEE 754 binary64 values.',
			recommended: false,
		},
		schema: [],
		messages,
		languages: [
			'css/css',
			'json/json',
			'json/jsonc',
			'json/json5',
			'toml/toml',
		],
	},
};

export default config;
