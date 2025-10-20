import {
	isCallExpression,
	isStringLiteral,
} from './ast/index.js';
import needsSemicolon from './utils/needs-semicolon.js';

const MESSAGE_ID_ERROR = 'prefer-bigint-literals/error';
const MESSAGE_ID_SUGGESTION = 'prefer-bigint-literals/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer using bigint literal over `BigInt(…)`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with {{replacement}}.',
};

const canUseNumericLiteralRaw = (value, nodeRaw) => {
	const raw = nodeRaw.replaceAll('_', '').toLowerCase();

	if (raw.includes('.')) {
		return false;
	}

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

function getValueOfNode(valueNode) {
	// -BigInt(1)
	if (valueNode.type === 'UnaryExpression' && (valueNode.operator === '+' || valueNode.operator === '-')) {
		return valueNode.operator === '+'
			? {value: valueNode.argument.value, raw: valueNode.argument.raw, isPlusSignUnary: true}
			: {value: -valueNode.argument.value, raw: `-${valueNode.argument.raw}`, isPlusSignUnary: false};
	}

	return {value: valueNode.value, raw: valueNode.raw, isPlusSignUnary: false};
}

function getReplacement(valueNode) {
	if (isStringLiteral(valueNode)) {
		let raw = valueNode.raw.slice(1, -1);
		try {
			BigInt(raw);
		} catch {
			return;
		}

		// BigInt("+1") -> 1n
		const plusSignIndex = raw.indexOf('+');

		if (plusSignIndex !== -1) {
			raw = raw.slice(0, plusSignIndex) + raw.slice(plusSignIndex + 1);
			return {shouldUseSuggestion: true, text: `${raw.trimEnd()}n`};
		}

		return {shouldUseSuggestion: false, text: `${raw.trimEnd()}n`};
	}

	const {value, raw, isPlusSignUnary} = getValueOfNode(valueNode);

	if (!Number.isInteger(value)) {
		return;
	}

	let bigint;
	try {
		bigint = BigInt(value);
	} catch {
		return;
	}

	const shouldUseSuggestion = isPlusSignUnary ? true : !canUseNumericLiteralRaw(value, raw);
	const text = shouldUseSuggestion ? `${bigint}n` : `${raw}n`;
	return {shouldUseSuggestion, text};
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

		let {shouldUseSuggestion, text} = replacement;
		let nodeToReplace = callExpression;

		const {parent} = callExpression;

		// -BigInt(-1) -> -(-1n)
		// -BigInt("-1") -> -(-1n)
		if (
			parent.type === 'UnaryExpression'
			&& parent.operator === '-'
			&& text.startsWith('-')
		) {
			nodeToReplace = parent;
			text = `-(-${text.slice(1)})`;
		}

		const tokenBefore = context.sourceCode.getTokenBefore(nodeToReplace);
		if (needsSemicolon(tokenBefore, context, text)) {
			text = `;${text}`;
		}

		const problem = {
			node: nodeToReplace,
			messageId: MESSAGE_ID_ERROR,
		};

		/** @param {import('eslint').Rule.RuleFixer} fixer */
		const fix = fixer => fixer.replaceText(nodeToReplace, text);

		if (shouldUseSuggestion || context.sourceCode.getCommentsInside(nodeToReplace).length > 0) {
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
