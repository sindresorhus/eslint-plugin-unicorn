import {
	isCallExpression,
	isStringLiteral,
} from './ast/index.js';

const MESSAGE_ID_ERROR = 'prefer-bigint-literals/error';
const MESSAGE_ID_SUGGESTION = 'prefer-bigint-literals/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer using bigint literal over `BigInt(…)`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with {{replacement}}.',
};

const canUseNumericLiteralRaw = numericLiteral => {
	const raw = numericLiteral.raw.replaceAll('_', '').toLowerCase();

	if (raw.includes('.')) {
		return false;
	}

	const {value} = numericLiteral;

	for (const {prefix, base} of [
		{prefix: '0b', base: 2},
		{prefix: '0o', base: 8},
		{prefix: '0x', base: 16},
	]) {
		if (raw.startsWith(prefix)) {
			return raw.slice(2) === value.toString(base);
		}
	}

	if (raw.includes('e')) {
		return false;
	}

	return raw === String(value);
};

function getReplacement(valueNode) {
	if (isStringLiteral(valueNode)) {
		const raw = valueNode.raw.slice(1, -1);
		try {
			BigInt(raw);
		} catch {
			return;
		}

		return {shouldUseSuggestion: false, text: `${raw.trimEnd()}n`};
	}

	const {value, raw} = valueNode;

	if (!Number.isInteger(value)) {
		return;
	}

	let bigint;
	try {
		bigint = BigInt(value);
	} catch {
		return;
	}

	const shouldUseSuggestion = !canUseNumericLiteralRaw(valueNode);
	const text = shouldUseSuggestion ? `${bigint}n` : `${raw}n`;
	return {shouldUseSuggestion, text};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(callExpression) {
		if (!isCallExpression(callExpression, {
			name: 'BigInt',
			argumentsLength: 1,
			optional: false,
		})) {
			return;
		}

		const [valueNode] = callExpression.arguments;
		const replacement = getReplacement(valueNode);
		if (!replacement) {
			return;
		}

		const problem = {
			node: callExpression,
			messageId: MESSAGE_ID_ERROR,
		};

		const {shouldUseSuggestion, text} = replacement;

		/** @param {import('eslint').Rule.RuleFixer} fixer */
		const fix = fixer => fixer.replaceText(callExpression, text);

		if (shouldUseSuggestion || context.sourceCode.getCommentsInside(callExpression).length > 0) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data: {
						replacement: text.length < 20 ? `\`${text}\`` : 'a bigint literal',
					},
					fix,
				},
			];
		} else {
			problem.fix = fix;
		}

		return problem;
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `BigInt` literals over the constructor.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
