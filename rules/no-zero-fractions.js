import {
	isParenthesized,
	needsSemicolon,
	isDecimalInteger,
	toLocation,
} from './utils/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {isNumericLiteral} from './ast/index.js';
import getCssNumbers from './shared/css-numbers.js';

const MESSAGE_ZERO_FRACTION = 'zero-fraction';
const MESSAGE_DANGLING_DOT = 'dangling-dot';
const MESSAGE_LEADING_ZERO = 'leading-zero';
const messages = {
	[MESSAGE_LEADING_ZERO]: 'Use a leading zero before the decimal point.',
	[MESSAGE_ZERO_FRACTION]: 'Don\'t use a zero fraction in the number.',
	[MESSAGE_DANGLING_DOT]: 'Don\'t use a dangling dot in the number.',
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const getProblem = (node, raw, range) => {
		// Legacy octal number `0777` and prefixed number `0o1234` cannot have a dot.
		const match = raw.match(/^(?<sign>[+-]?)(?<before>[\d_]*)(?<dotAndFractions>\.[\d_]*)(?<after>.*)$/);
		if (!match) {
			return;
		}

		const {sign, before, dotAndFractions, after} = match.groups;
		let fixedDotAndFractions = dotAndFractions.replaceAll(/[.0_]+$/g, '');
		if (!fixedDotAndFractions && (node.type === 'YAMLScalar' || (node.type === 'TOMLValue' && !after))) {
			fixedDotAndFractions = '.0';
		}

		const formatted = sign + (before || '0') + fixedDotAndFractions + after;

		if (formatted === raw) {
			return;
		}

		const isDanglingDot = dotAndFractions === '.';
		const {sourceCode} = context;
		// End of fractions
		const end = range[0] + sign.length + before.length + dotAndFractions.length;
		const needsLeadingZero = !before && fixedDotAndFractions !== '';
		const start = needsLeadingZero ? range[0] + sign.length : end - Math.max(raw.length - formatted.length, 0);
		return {
			loc: toLocation([start, end], context),
			messageId: needsLeadingZero ? MESSAGE_LEADING_ZERO : (isDanglingDot ? MESSAGE_DANGLING_DOT : MESSAGE_ZERO_FRACTION),
			* fix(fixer) {
				let fixed = formatted;
				if (
					node.parent?.type === 'MemberExpression'
					&& node.parent.object === node
					&& isDecimalInteger(formatted)
					&& !isParenthesized(node, context)
				) {
					fixed = `(${fixed})`;

					if (needsSemicolon(sourceCode.getTokenBefore(node), context, fixed)) {
						fixed = `;${fixed}`;
					}
				}

				yield fixer.replaceTextRange(range, fixed);
				if (node.type === 'Literal') {
					yield fixSpaceAroundKeyword(fixer, node, context);
				}
			},
		};
	};

	context.on(['Literal', 'Number', 'TOMLValue', 'YAMLScalar'], node => {
		if (
			isNumericLiteral(node)
			|| (node.type === 'Number' && typeof node.value === 'number')
			|| (node.type === 'YAMLScalar' && typeof node.value === 'number' && !node.parent.tag && !/^[+-]?\.(?:inf|nan)$/i.test(node.raw))
			|| (node.type === 'TOMLValue' && node.kind === 'float')
		) {
			return getProblem(node, context.sourceCode.getText(node), context.sourceCode.getRange(node));
		}
	});

	context.on(['Number', 'Dimension', 'Percentage', 'Raw'], function * (node) {
		if (context.sourceCode.ast.type !== 'StyleSheet') {
			return;
		}

		for (const {raw, numberRange, hasMergingNeighbor} of getCssNumbers(node, context)) {
			if (hasMergingNeighbor) {
				continue;
			}

			const problem = getProblem(node, raw, numberRange);
			if (problem) {
				yield problem;
			}
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require consistent decimal numbers without redundant zeros.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
			'yml/yaml',
			'toml/toml',
			'json/json',
			'json/jsonc',
			'json/json5',
			'css/css',
		],
	},
};

export default config;
