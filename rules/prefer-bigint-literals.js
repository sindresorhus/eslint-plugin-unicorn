import {
	isCallExpression,
	isStringLiteral,
} from './ast/index.js';
import {
	needsSemicolon,
	isParenthesized,
} from './utils/index.js';

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
		let bigint;
		try {
			bigint = BigInt(raw);
		} catch {
			return;
		}

		let text = bigint === 0n ? '0' : raw.trim();
		if (text.startsWith('+')) {
			text = text.slice(1).trim();
		}

		return {shouldUseSuggestion: false, text: `${text}n`, bigint};
	}

	let isNegated = false;
	while (valueNode.type === 'UnaryExpression' && valueNode.prefix) {
		if (valueNode.operator === '+') {
			valueNode = valueNode.argument;
		} else if (valueNode.operator === '-') {
			isNegated = !isNegated;
			valueNode = valueNode.argument;
		} else {
			return;
		}
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
	let text = shouldUseSuggestion ? `${bigint}n` : `${raw}n`;

	if (isNegated && bigint !== 0n) {
		text = `-${text}`;
		bigint = -bigint;
	}

	return {shouldUseSuggestion, text, bigint};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
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

		const {shouldUseSuggestion, text, bigint} = replacement;

		/** @param {import('eslint').Rule.RuleFixer} fixer */
		const fix = fixer => {
			let replacementText = text;
			if (!isParenthesized(callExpression, context) && bigint < 0n) {
				replacementText = `(${replacementText})`;

				const tokenBefore = context.sourceCode.getTokenBefore(callExpression);

				if (needsSemicolon(tokenBefore, context, replacementText)) {
					replacementText = `;${replacementText}`;
				}
			}

			return fixer.replaceText(callExpression, replacementText);
		};

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
	});
};

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
