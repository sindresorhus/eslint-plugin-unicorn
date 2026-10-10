/**
@import * as ESLint from 'eslint';
*/
import {replaceStringRaw, replaceTemplateElement} from './fix/index.js';
import {getTemplateElementRaw} from './utils/index.js';
import {isStringLiteral, isTaggedTemplateLiteral} from './ast/index.js';

const MESSAGE_ID = 'prefer-short-escape-sequences';
const messages = {
	[MESSAGE_ID]: 'Prefer shorter alternatives to Unicode escape sequences.',
};

const commonReplacements = new Map([
	['0008', String.raw`\b`],
	['0009', String.raw`\t`],
	['000A', String.raw`\n`],
	['000C', String.raw`\f`],
	['000D', String.raw`\r`],
]);
const somlReplacements = new Map([
	['0009', String.raw`\t`],
	['000A', String.raw`\n`],
]);
const tomlReplacements = new Map([
	['0022', String.raw`\"`],
	['0027', '\''],
	['002F', '/'],
	['005C', String.raw`\\`],
]);
const javascriptReplacements = new Map([
	['0000', String.raw`\0`],
	['000B', String.raw`\v`],
]);
// Consume backslash runs even without a Unicode suffix to avoid quadratic backtracking.
const unicodeEscapePattern = /(?<backslashes>\\+)(?:u(?<codePoint>[\dA-Fa-f]{4}))?/gv;

const somlUnicodeEscapePattern = /(?<backslashes>\\+)(?:u\{(?<codePoint>[\dA-Fa-f]+)\})?/gv;

function getReplacement(codePoint, {dialect, nextCharacter}) {
	if (dialect === 'soml') {
		return somlReplacements.get(codePoint);
	}

	if (dialect === 'toml') {
		return tomlReplacements.get(codePoint) ?? commonReplacements.get(codePoint);
	}

	if (dialect === 'javascript') {
		if (codePoint === '0000' && /^\d$/v.test(nextCharacter)) {
			return;
		}

		const replacement = javascriptReplacements.get(codePoint);
		if (replacement) {
			return replacement;
		}
	}

	return commonReplacements.get(codePoint);
}

function replaceUnicodeEscapeSequences(content, {dialect}) {
	const pattern = dialect === 'soml' ? somlUnicodeEscapePattern : unicodeEscapePattern;
	const fixed = content.replaceAll(pattern, (match, backslashes, codePoint, offset) => {
		if (codePoint === undefined || backslashes.length % 2 === 0) {
			return match;
		}

		const replacement = getReplacement(codePoint.toUpperCase().padStart(4, '0'), {
			dialect,
			nextCharacter: content[offset + match.length],
		});
		if (!replacement) {
			return match;
		}

		return backslashes.slice(0, -1) + replacement;
	});

	return fixed === content ? undefined : fixed;
}

function getProblem(node, content, options, fix) {
	const fixed = replaceUnicodeEscapeSequences(content, options);
	if (fixed === undefined) {
		return;
	}

	return {
		node,
		messageId: MESSAGE_ID,
		fix: fixer => fix(fixer, fixed),
	};
}

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const isSoml = sourceCode.parserServices?.isSOML === true;

	context.on(['String', 'Key'], node => {
		if (isSoml && node.style !== 'escaped') {
			return;
		}

		const raw = sourceCode.getText(node);
		if (isSoml) {
			return getProblem(node, raw, {dialect: 'soml'}, (fixer, fixed) => fixer.replaceText(node, fixed));
		}

		return getProblem(node, raw.slice(1, -1), {dialect: 'json'}, (fixer, fixed) => replaceStringRaw(node, fixed, context, fixer));
	});

	context.on('Literal', node => {
		if (!isStringLiteral(node) || node.parent.type === 'JSXAttribute') {
			return;
		}

		const {raw} = node;
		return getProblem(node, raw.slice(1, -1), {dialect: 'javascript'}, (fixer, fixed) => replaceStringRaw(node, fixed, context, fixer));
	});

	context.on('TemplateElement', node => {
		if (isTaggedTemplateLiteral(node.parent)) {
			return;
		}

		return getProblem(node, getTemplateElementRaw(node, context), {dialect: 'javascript'}, (fixer, fixed) => replaceTemplateElement(node, fixed, context, fixer));
	});

	context.on(['TOMLValue', 'TOMLQuoted'], node => {
		if (node.kind !== 'string' || node.style !== 'basic') {
			return;
		}

		const raw = sourceCode.getText(node);
		const delimiterLength = raw.startsWith('"""') ? 3 : 1;
		const [start, end] = sourceCode.getRange(node);
		return getProblem(
			node,
			raw.slice(delimiterLength, -delimiterLength),
			{dialect: 'toml'},
			(fixer, fixed) => fixer.replaceTextRange([start + delimiterLength, end - delimiterLength], fixed),
		);
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer shorter alternatives to Unicode escape sequences.',
			recommended: 'unopinionated',
		},
		fixable: 'code',

		messages,
		languages: [
			'js/js',
			'json/json',
			'json/jsonc',
			'json/json5',
			'toml/toml',
			'soml/soml',
		],
	},
};

export default config;
