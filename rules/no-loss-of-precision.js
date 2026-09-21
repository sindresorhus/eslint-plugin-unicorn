const MESSAGE_ID = 'no-loss-of-precision';
const messages = {
	[MESSAGE_ID]: 'This numeric literal loses precision when represented as an IEEE 754 binary64 value.',
};

const getDecimalRepresentation = text => {
	const [mantissa, exponent = '0'] = text.toLowerCase().split('e', 2);
	const decimalPointIndex = mantissa.indexOf('.');
	const fractionLength = decimalPointIndex === -1 ? 0 : mantissa.length - decimalPointIndex - 1;
	const significantDigits = mantissa.replace('.', '').replace(/^0+/u, '');
	const digits = significantDigits.replace(/0+$/u, '');

	return {
		digits,
		power: Number(exponent) - fractionLength + significantDigits.length - digits.length,
		precision: (decimalPointIndex === -1 || text.endsWith('.') ? digits : significantDigits).length || 1,
	};
};

const decimalLosesPrecision = (raw, value) => {
	const written = getDecimalRepresentation(raw);
	if (value === 0) {
		return written.digits !== '';
	}

	if (!Number.isFinite(value) || written.precision > 100) {
		return true;
	}

	const stored = getDecimalRepresentation(Math.abs(value).toPrecision(written.precision));
	return written.digits !== stored.digits || written.power !== stored.power;
};

const losesPrecision = (raw, value) => {
	raw = raw.replace(/^[+-]/u, '');
	if (/^(?:inf(?:inity)?|nan)$/iu.test(raw)) {
		return false;
	}

	if (/^0x/iu.test(raw)) {
		return !Number.isFinite(value) || BigInt(raw) !== BigInt(Math.abs(value));
	}

	return decimalLosesPrecision(raw, value);
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
