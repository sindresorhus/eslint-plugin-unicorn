import {checkVueTemplate} from './utils/rule.js';
import {isNumberLiteral, isBigIntLiteral} from './ast/index.js';

const MESSAGE_ID = 'number-literal-case';
const messages = {
	[MESSAGE_ID]: 'Invalid number literal casing.',
};

/**
 @param {string} raw
 @param {Options[keyof Options]} option
 */
const convertCase = (raw, option) => {
	if (option === 'uppercase') {
		return raw.toUpperCase();
	}

	if (option === 'lowercase') {
		return raw.toLowerCase();
	}

	return raw;
};

/**
 @param {string} raw
 @param {Options} options
 */
const fix = (raw, options) => {
	let fixed = raw;
	let isSpecialBase = false; // Indicates that the number is hexadecimal, octal, or binary.
	fixed = fixed.replace(/^(0[box])(.*)/i, (_, radix, value) => {
		isSpecialBase = true;
		radix = convertCase(radix, options.radixIdentifier);
		if (radix.toLowerCase() === '0x') {
			value = convertCase(value, options.hexadecimalValue);
		}

		return radix + value;
	});

	if (!isSpecialBase) {
		fixed = fixed.replaceAll(/e/gi, expo => convertCase(expo, options.exponentialNotation));
	}

	return fixed;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	Literal(node) {
		const {raw} = node;

		/** @type {Options} */
		const options = context.options[0] ?? {};
		options.hexadecimalValue ??= 'uppercase';
		options.radixIdentifier ??= 'lowercase';
		options.exponentialNotation ??= 'lowercase';

		let fixed = raw;
		if (isNumberLiteral(node)) {
			fixed = fix(raw, options);
		} else if (isBigIntLiteral(node)) {
			fixed = fix(raw.slice(0, -1), options) + 'n';
		}

		if (raw !== fixed) {
			return {
				node,
				messageId: MESSAGE_ID,
				fix: fixer => fixer.replaceText(node, fixed),
			};
		}
	},
});

/** @typedef {Record<keyof typeof schema[0]["properties"], typeof caseEnum["enum"][number]>} Options */

const caseEnum = /** @type {const} */ ({
	enum: [
		'uppercase',
		'lowercase',
		'ignore',
	],
});

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			hexadecimalValue: caseEnum,
			radixIdentifier: caseEnum,
			exponentialNotation: caseEnum,
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create: checkVueTemplate(create),
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce proper case for numeric literals.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{
			hexadecimalValue: 'uppercase',
			radixIdentifier: 'lowercase',
			exponentialNotation: 'lowercase',
		}],
		messages,
	},
};

export default config;
