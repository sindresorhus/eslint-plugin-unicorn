/**
@import * as ESLint from 'eslint';
*/
import {replaceTemplateElement} from './fix/index.js';
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
const tomlReplacements = new Map([
	['0022', String.raw`\"`],
	['0027', '\''],
	['002F', '/'],
	['005C', String.raw`\\`],
]);
const javascriptAndJson5Replacements = new Map([
	['0000', String.raw`\0`],
	['000B', String.raw`\v`],
]);
// Consume backslash runs even without a Unicode suffix to avoid quadratic backtracking.
const unicodeEscapePattern = /(?<backslashes>\\+)(?:u(?<codePoint>[\dA-Fa-f]{4}))?/gv;

function getReplacement(codePoint, {dialect, nextCharacter}) {
	if (dialect === 'toml') {
		return tomlReplacements.get(codePoint) ?? commonReplacements.get(codePoint);
	}

	if (dialect === 'javascript' || dialect === 'json5') {
		if (codePoint === '0000' && /^\d$/v.test(nextCharacter)) {
			return;
		}

		const replacement = javascriptAndJson5Replacements.get(codePoint);
		if (replacement) {
			return replacement;
		}
	}

	return commonReplacements.get(codePoint);
}

function replaceUnicodeEscapeSequences(content, {dialect}) {
	const fixed = content.replaceAll(unicodeEscapePattern, (match, backslashes, codePoint, offset) => {
		if (codePoint === undefined || backslashes.length % 2 === 0) {
			return match;
		}

		const replacement = getReplacement(codePoint.toUpperCase(), {
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
	const jsonDialect = context.physicalFilename.toLowerCase().endsWith('.json5') ? 'json5' : 'json';

	context.on('String', node => {
		const raw = sourceCode.getText(node);
		const [start, end] = sourceCode.getRange(node);
		return getProblem(node, raw.slice(1, -1), {dialect: jsonDialect}, (fixer, fixed) => fixer.replaceTextRange([start + 1, end - 1], fixed));
	});

	context.on('Literal', node => {
		if (!isStringLiteral(node) || node.parent.type === 'JSXAttribute') {
			return;
		}

		const {raw} = node;
		const [start, end] = sourceCode.getRange(node);
		return getProblem(node, raw.slice(1, -1), {dialect: 'javascript'}, (fixer, fixed) => fixer.replaceTextRange([start + 1, end - 1], fixed));
	});

	context.on('TemplateElement', node => {
		if (isTaggedTemplateLiteral(node.parent)) {
			return;
		}

		const raw = sourceCode.getText(node);
		return getProblem(node, raw.slice(1, node.tail ? -1 : -2), {dialect: 'javascript'}, (fixer, fixed) => replaceTemplateElement(node, fixed, context, fixer));
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
		],
	},
};

export default config;
