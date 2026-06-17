import {isNumericLiteral} from './ast/index.js';

const MESSAGE_ID_ERROR = 'prefer-math-constants/error';
const MESSAGE_ID_SUGGESTION = 'prefer-math-constants/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{constant}}` over the approximate value `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{constant}}`.',
};

/*
The numeric static properties of `Math`, paired with the minimum number of fraction digits a literal must have before it's treated as an approximation.

The thresholds are inspired by Rust Clippy's `approx_constant`, tuned so the iconic short forms `3.14` (`Math.PI`) and `2.718` (`Math.E`) are caught, while the others require more digits so common decimals like `0.69` or `1.41` are not flagged.
*/
const mathConstants = [
	{name: 'PI', minimumFractionDigits: 2},
	{name: 'E', minimumFractionDigits: 3},
	{name: 'LN2', minimumFractionDigits: 4},
	{name: 'LN10', minimumFractionDigits: 4},
	{name: 'LOG2E', minimumFractionDigits: 4},
	{name: 'LOG10E', minimumFractionDigits: 4},
	{name: 'SQRT2', minimumFractionDigits: 4},
	{name: 'SQRT1_2', minimumFractionDigits: 4},
];

/**
Check if the literal is in a position where a `Math.*` member expression cannot be substituted: a non-computed property key (`{3.14: 1}`, class members, interface members) or a TypeScript literal type (`type Foo = 3.14`, `value as 3.14`). Computed keys (`{[3.14]: 1}`) are fine to replace.

@param {import('estree').Literal} node
@returns {boolean}
*/
const isNonReplaceable = node => {
	const {parent} = node;
	return (parent.key === node && !parent.computed)
		|| (parent.type === 'TSLiteralType' && parent.literal === node);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Literal', node => {
		if (!isNumericLiteral(node) || isNonReplaceable(node)) {
			return;
		}

		// Only plain decimals: optional integer part, a dot, and one or more fraction digits.
		// This skips integers, hex/octal/binary, BigInt, exponents, and trailing-dot numbers.
		const text = node.raw.replaceAll('_', '');
		if (!/^\d*\.\d+$/.test(text)) {
			return;
		}

		const [integerPart, fractionPart] = text.split('.');
		const normalizedValue = `${integerPart || '0'}.${fractionPart}`;
		const fractionLength = fractionPart.length;

		for (const {name, minimumFractionDigits} of mathConstants) {
			if (fractionLength < minimumFractionDigits) {
				continue;
			}

			const exact = Math[name];
			const exactString = String(exact);

			// The literal is a truncation of the constant, or rounds to it at the precision the author wrote.
			if (exactString.startsWith(normalizedValue) || (normalizedValue.length < exactString.length && exact.toFixed(fractionLength) === normalizedValue)) {
				const constant = `Math.${name}`;
				const data = {constant, value: node.raw};

				return {
					node,
					messageId: MESSAGE_ID_ERROR,
					data,
					suggest: [
						{
							messageId: MESSAGE_ID_SUGGESTION,
							data,
							fix: fixer => fixer.replaceText(node, constant),
						},
					],
				};
			}
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Math` constants over their approximate numeric values.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
