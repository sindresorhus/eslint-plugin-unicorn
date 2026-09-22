import {checkVueTemplate} from './utils/rule.js';
import {isNumericLiteral, isBigIntLiteral} from './ast/index.js';
import {toLocation} from './utils/index.js';
import getCssNumbers from './shared/css-numbers.js';

const MESSAGE_ID = 'number-literal-case';
const messages = {
	[MESSAGE_ID]: 'Invalid number literal casing.',
};

/**
@param {string} raw
@param {Options} options
*/
const fix = (raw, {hexadecimalValue}) => {
	const fixed = raw.toLowerCase();
	return fixed.replace(/0x([\d_a-f]+)/v, (_, digits) => '0x' + digits[hexadecimalValue === 'lowercase' ? 'toLowerCase' : 'toUpperCase']());
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const options = context.options[0];

	context.on(['Literal', 'TOMLValue', 'Number', 'YAMLScalar'], node => {
		const raw = context.sourceCode.getText(node);

		let fixed = raw;
		if (
			isNumericLiteral(node)
			|| (node.type === 'Number' && typeof node.value === 'number' && !/^[+\-]?[IN]/v.test(raw))
			|| (node.type === 'YAMLScalar' && typeof node.value === 'number' && !node.parent.tag && !/^[+-]?\.(?:inf|nan)$/i.test(raw))
			|| (node.type === 'TOMLValue' && (node.kind === 'integer' || node.kind === 'float'))
		) {
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
	});

	context.on(['Number', 'Dimension', 'Percentage', 'Raw'], function * (node) {
		if (context.sourceCode.ast.type !== 'StyleSheet') {
			return;
		}

		for (const {raw, numberRange} of getCssNumbers(node, context)) {
			const fixed = raw.toLowerCase();
			if (fixed !== raw) {
				yield {
					loc: toLocation(numberRange, context),
					messageId: MESSAGE_ID,
					fix: fixer => fixer.replaceTextRange(numberRange, fixed),
				};
			}
		}
	});
};

/**
@typedef {Record<keyof typeof schema[0]["properties"], typeof caseEnum["enum"][number]>} Options
*/

const caseEnum = /** @type {const} */ ({
	enum: ['uppercase', 'lowercase'],
});

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			hexadecimalValue: caseEnum,
		},
	},
];

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create: checkVueTemplate(create),
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce proper case for numeric literals.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema,
		defaultOptions: [{
			hexadecimalValue: 'uppercase',
		}],
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
