import {
	ident,
	string as cssString,
	tokenize,
	tokenTypes,
} from '@eslint/css-tree';
import {replaceTemplateElement} from './fix/index.js';
import {isDirective, isStringLiteral, isTaggedTemplateLiteral} from './ast/index.js';
import {escapeTemplateElementRaw, getTemplateElementRaw} from './utils/index.js';

const MESSAGE_ID = 'prefer-literal-ascii';
const messages = {
	[MESSAGE_ID]: 'Prefer literal printable ASCII characters over escape sequences.',
};

const BACKSLASH = '\\';
const MINIMUM_PRINTABLE_ASCII = 0x20;
const MAXIMUM_PRINTABLE_ASCII = 0x7E;
const numericEscapePattern = /\\x(?<hex>[\dA-Fa-f]{2})|\\u(?<unicode>[\dA-Fa-f]{4})|\\u\{(?<codePoint>[\dA-Fa-f]+)\}/vy;
const cssNumericEscapePattern = /\\(?<digits>[\da-f]{1,6})(?:\r\n|[\t\n\f\r ])?/iy;
const cssIdentifierTokenTypes = new Set([tokenTypes.Ident, tokenTypes.Hash, tokenTypes.AtKeyword, tokenTypes.Function, tokenTypes.Dimension]);

function isEscapedCharacter(text, index) {
	let backslashCount = 0;

	for (let previousIndex = index - 1; previousIndex >= 0 && text[previousIndex] === BACKSLASH; previousIndex--) {
		backslashCount++;
	}

	return backslashCount % 2 === 1;
}

function getNumericEscape(text, index) {
	numericEscapePattern.lastIndex = index;
	const match = numericEscapePattern.exec(text);
	if (!match) {
		return;
	}

	const digits = match.groups.hex ?? match.groups.unicode ?? match.groups.codePoint;
	const value = Number.parseInt(digits, 16);

	return {
		end: numericEscapePattern.lastIndex,
		value,
	};
}

function isPrintableAscii(value) {
	return value >= MINIMUM_PRINTABLE_ASCII && value <= MAXIMUM_PRINTABLE_ASCII;
}

function getReplacement(character, quote) {
	if (character === BACKSLASH || character === quote) {
		return BACKSLASH + character;
	}

	return character;
}

function wouldExtendLegacyEscape(text, character) {
	if (character < '0' || character > '9') {
		return false;
	}

	let digitStart = text.length;
	while (
		digitStart > 0
		&& text[digitStart - 1] >= '0'
		&& text[digitStart - 1] <= '7'
		&& text.length - digitStart < 3
	) {
		digitStart--;
	}

	const backslashIndex = digitStart - 1;
	if (
		text[backslashIndex] !== BACKSLASH
		|| isEscapedCharacter(text, backslashIndex)
	) {
		return false;
	}

	const digits = text.slice(digitStart);
	if (digits === '0') {
		return true;
	}

	if (character > '7') {
		return false;
	}

	const maximumLength = digits[0] <= '3' ? 3 : 2;
	return digits.length < maximumLength;
}

function replaceEscapes(text, quote, checkSlash) {
	let fixed = '';
	let canFix = true;

	for (let index = 0; index < text.length; index++) {
		const character = text[index];
		if (character !== BACKSLASH) {
			fixed += character;
			continue;
		}

		if (text[index + 1] === BACKSLASH) {
			fixed += BACKSLASH + BACKSLASH;
			index++;
			continue;
		}

		if (checkSlash && text[index + 1] === '/') {
			fixed += '/';
			index++;
			continue;
		}

		const escape = getNumericEscape(text, index);
		if (!escape || !isPrintableAscii(escape.value)) {
			fixed += character;
			continue;
		}

		const replacementCharacter = String.fromCodePoint(escape.value);
		if (wouldExtendLegacyEscape(fixed, replacementCharacter)) {
			canFix = false;
		}

		fixed += getReplacement(replacementCharacter, quote);
		index = escape.end - 1;
	}

	return {fixed, canFix};
}

function replaceCssEscapes(text, quote) {
	let fixed = '';
	for (let index = 0; index < text.length; index++) {
		const character = text[index];
		if (character !== BACKSLASH) {
			fixed += character;
			continue;
		}

		if (text[index + 1] === BACKSLASH) {
			fixed += BACKSLASH + BACKSLASH;
			index++;
			continue;
		}

		cssNumericEscapePattern.lastIndex = index;
		const match = cssNumericEscapePattern.exec(text);
		if (!match) {
			fixed += character;
			continue;
		}

		const value = Number.parseInt(match.groups.digits, 16);
		if (!isPrintableAscii(value)) {
			fixed += character;
			continue;
		}

		fixed += getReplacement(String.fromCodePoint(value), quote);
		index = cssNumericEscapePattern.lastIndex - 1;
	}

	return fixed;
}

function getCssTokens(text) {
	const tokens = [];
	tokenize(text, (type, start, end) => {
		tokens.push({type, value: ident.decode(text.slice(start, end))});
	});
	return tokens;
}

function isSameCssTokens(original, fixed) {
	const originalTokens = getCssTokens(original);
	const fixedTokens = getCssTokens(fixed);
	return originalTokens.length === fixedTokens.length && originalTokens.every((token, index) => token.type === fixedTokens[index].type && token.value === fixedTokens[index].value);
}

function isCssUrlString(tokens, index, text) {
	let previousIndex = index - 1;
	while ([tokenTypes.WhiteSpace, tokenTypes.Comment].includes(tokens[previousIndex]?.type)) {
		previousIndex--;
	}

	const previous = tokens[previousIndex];
	return previous ? isCssUrlFunction(previous.type, text.slice(previous.start, previous.end)) : false;
}

function isCssUrlFunction(type, text) {
	return type === tokenTypes.Function && ident.decode(text.slice(0, -1)).toLowerCase() === 'url';
}

function getProblem(node, original, quote, fix) {
	const {fixed, canFix} = replaceEscapes(original, quote, node.type === 'String');
	if (fixed === original) {
		return;
	}

	const isTypeTemplateWithLiteralBackslash = node.type === 'TemplateElement' && node.parent.parent.type === 'TSLiteralType' && node.value.cooked.includes(BACKSLASH);
	const canAutoFix = canFix && !isTypeTemplateWithLiteralBackslash && (node.type !== 'Literal' || !isDirective(node.parent));

	return {
		node,
		messageId: MESSAGE_ID,
		...(canAutoFix && {
			fix: fixer => fix ? fix(fixer, fixed) : fixer.replaceText(node, fixed),
		}),
	};
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('StyleSheet', node => {
		const {sourceCode} = context;
		const {text} = sourceCode;
		const problems = [];
		const tokens = [];
		tokenize(text, (type, start, end) => {
			tokens.push({type, start, end});
		});
		const firstToken = tokens[0];
		const isInitialCharset = firstToken?.type === tokenTypes.AtKeyword && firstToken.start === 0 && ident.decode(text.slice(0, firstToken.end)) === '@charset';

		for (const [index, {type, start, end}] of tokens.entries()) {
			const isString = type === tokenTypes.String;
			if (isInitialCharset && (index === 0 || (index === 2 && isString))) {
				continue;
			}

			if ((!isString && !cssIdentifierTokenTypes.has(type)) || isCssUrlFunction(type, text.slice(start, end)) || (isString && isCssUrlString(tokens, index, text))) {
				continue;
			}

			const original = text.slice(start, end);
			const fixed = replaceCssEscapes(original, isString ? original[0] : undefined);
			if (fixed === original) {
				continue;
			}

			if (isString) {
				if (cssString.decode(original) !== cssString.decode(fixed)) {
					continue;
				}
			} else {
				if (type === tokenTypes.Hash && getCssTokens(fixed.slice(1))[0]?.type !== tokenTypes.Ident) {
					continue;
				}

				const previousStart = tokens[index - 1]?.start ?? start;
				const nextEnd = tokens[index + 1]?.end ?? end;
				const originalContext = text.slice(previousStart, nextEnd);
				const fixedContext = text.slice(previousStart, start) + fixed + text.slice(end, nextEnd);
				if (!isSameCssTokens(originalContext, fixedContext)) {
					continue;
				}
			}

			problems.push({
				node,
				messageId: MESSAGE_ID,
				loc: {start: sourceCode.getLocFromIndex(start), end: sourceCode.getLocFromIndex(end)},
				fix: fixer => fixer.replaceTextRange([start, end], fixed),
			});
		}

		return problems;
	});

	context.on('String', node => {
		if (context.sourceCode.ast.type === 'StyleSheet') {
			return;
		}

		const original = context.sourceCode.getText(node);
		return getProblem(node, original, original[0]);
	});

	context.on('Literal', node => {
		if (
			!isStringLiteral(node)
			|| node.parent.type === 'JSXAttribute'
		) {
			return;
		}

		return getProblem(node, node.raw, node.raw[0]);
	});

	context.on('TemplateElement', node => {
		if (isTaggedTemplateLiteral(node.parent)) {
			return;
		}

		return getProblem(
			node,
			getTemplateElementRaw(node, context),
			'`',
			(fixer, fixed) => replaceTemplateElement(node, escapeTemplateElementRaw(fixed), context, fixer),
		);
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
			description: 'Prefer literal printable ASCII characters over escape sequences.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
			'css/css',
			'json/json',
			'json/jsonc',
			'json/json5',
		],
	},
};

export default config;
