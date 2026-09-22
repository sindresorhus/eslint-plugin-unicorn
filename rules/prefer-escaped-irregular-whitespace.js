import {replaceTemplateElement} from './fix/index.js';
import {isRegexLiteral, isStringLiteral, isTaggedTemplateLiteral} from './ast/index.js';
import {getTemplateElementRaw} from './utils/index.js';

const MESSAGE_ID = 'prefer-escaped-irregular-whitespace';
const messages = {
	[MESSAGE_ID]: 'Prefer escape sequences for irregular whitespace characters.',
};

const IRREGULAR_WHITESPACE = /[\v\f\u{85}\u{a0}\u{1680}\u{180e}\u{2000}-\u{200b}\u{2028}\u{2029}\u{202f}\u{205f}\u{3000}\u{feff}]/gu;
const LINE_TERMINATORS = new Set(['\u2028', '\u2029']);

const getCodePointEscape = character => String.raw`\u{${character.codePointAt(0).toString(16).toUpperCase()}}`;
const getFourDigitEscape = character => String.raw`\u${character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;

function isEscapedCharacter(text, index) {
	let backslashCount = 0;

	for (let previousIndex = index - 1; previousIndex >= 0 && text[previousIndex] === '\\'; previousIndex--) {
		backslashCount++;
	}

	return backslashCount % 2 === 1;
}

function getProblem(node, raw, {fix, shouldFix = true, escapeCharacter = getCodePointEscape} = {}) {
	let fixed = '';
	let lastIndex = 0;

	for (const match of raw.matchAll(IRREGULAR_WHITESPACE)) {
		const [character] = match;
		const {index} = match;
		const isEscaped = isEscapedCharacter(raw, index);
		fixed += raw.slice(lastIndex, index);

		if (
			isEscaped
			&& LINE_TERMINATORS.has(character)
		) {
			fixed += character;
		} else {
			if (isEscaped) {
				fixed = fixed.slice(0, -1);
			}

			fixed += escapeCharacter(character);
		}

		lastIndex = index + character.length;
	}

	fixed += raw.slice(lastIndex);

	if (fixed === raw) {
		return;
	}

	const problem = {
		node,
		messageId: MESSAGE_ID,
	};

	if (shouldFix) {
		problem.fix = fixer => fix ? fix(fixer, fixed) : fixer.replaceText(node, fixed);
	}

	return problem;
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Literal', node => {
		if (isStringLiteral(node)) {
			// JSX attribute string values do not interpret JavaScript escape sequences.
			if (node.parent.type === 'JSXAttribute') {
				return;
			}

			return getProblem(node, sourceCode.getText(node));
		}

		if (isRegexLiteral(node)) {
			const {flags} = node.regex;
			return getProblem(node, sourceCode.getText(node), {
				shouldFix: flags.includes('u') || flags.includes('v'),
			});
		}
	});

	context.on('String', node => getProblem(node, sourceCode.getText(node), {escapeCharacter: getFourDigitEscape}));

	context.on(['TOMLValue', 'TOMLQuoted'], node => {
		if (node.kind !== 'string' || node.style !== 'basic') {
			return;
		}

		return getProblem(node, sourceCode.getText(node), {escapeCharacter: getFourDigitEscape});
	});

	context.on('TemplateElement', node => {
		if (isTaggedTemplateLiteral(node.parent)) {
			return;
		}

		return getProblem(node, getTemplateElementRaw(node, context), {
			fix: (fixer, fixed) => replaceTemplateElement(node, fixed, context, fixer),
		});
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
			description: 'Prefer escape sequences for irregular whitespace characters.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
			'json/json',
			'json/jsonc',
			'json/json5',
			'toml/toml',
		],
	},
};

export default config;
