import {replaceTemplateElement} from './fix/index.js';
import {isRegexLiteral, isStringLiteral, isTaggedTemplateLiteral} from './ast/index.js';

const MESSAGE_ID = 'prefer-unicode-code-point-escapes';
const MESSAGE_ID_SUGGESTION = 'prefer-unicode-code-point-escapes/add-unicode-flag';
const messages = {
	[MESSAGE_ID]: 'Prefer Unicode code point escapes.',
	[MESSAGE_ID_SUGGESTION]: 'Use Unicode code point escapes and add the `u` flag.',
};

const BACKSLASH = '\\';
const CODE_POINT_ESCAPE_PREFIX = String.raw`\u{`;
const HEX_DIGIT = /^[\da-f]$/iv;
const OCTAL_DIGIT = /^[0-7]$/v;
const CONTROL_LETTER = /^[A-Za-z]$/v;
const MAXIMUM_CODE_POINT = 0x10_FF_FF;

function isHexDigit(character) {
	return HEX_DIGIT.test(character);
}

function isOctalDigit(character) {
	return OCTAL_DIGIT.test(character);
}

function isControlLetter(character) {
	return CONTROL_LETTER.test(character);
}

function isActiveBackslash(text, index) {
	let backslashCount = 0;

	for (let previousIndex = index - 1; previousIndex >= 0 && text[previousIndex] === BACKSLASH; previousIndex--) {
		backslashCount++;
	}

	return backslashCount % 2 === 0;
}

function isEscapedCharacter(text, index) {
	let backslashCount = 0;

	for (let previousIndex = index - 1; previousIndex >= 0 && text[previousIndex] === BACKSLASH; previousIndex--) {
		backslashCount++;
	}

	return backslashCount % 2 === 1;
}

function parseHex(text, start, length) {
	const value = text.slice(start, start + length);
	if (value.length !== length || [...value].some(character => !isHexDigit(character))) {
		return;
	}

	return Number.parseInt(value, 16);
}

function isHighSurrogate(value) {
	return value >= 0xD8_00 && value <= 0xDB_FF;
}

function isLowSurrogate(value) {
	return value >= 0xDC_00 && value <= 0xDF_FF;
}

function getSurrogatePairCodePoint(highSurrogate, lowSurrogate) {
	return ((highSurrogate - 0xD8_00) * 0x4_00) + (lowSurrogate - 0xDC_00) + 0x1_00_00;
}

function formatCodePointEscape(value) {
	return String.raw`\u{${value.toString(16).toUpperCase()}}`;
}

function parseCodePointEscape(text, index) {
	if (!text.startsWith(CODE_POINT_ESCAPE_PREFIX, index)) {
		return;
	}

	let end = index + CODE_POINT_ESCAPE_PREFIX.length;
	while (isHexDigit(text[end])) {
		end++;
	}

	if (
		end === index + CODE_POINT_ESCAPE_PREFIX.length
		|| text[end] !== '}'
	) {
		return;
	}

	const value = Number.parseInt(text.slice(index + CODE_POINT_ESCAPE_PREFIX.length, end), 16);
	if (value > MAXIMUM_CODE_POINT) {
		return;
	}

	return value;
}

function getOctalEscape(text, index) {
	const firstDigit = text[index + 1];
	if (
		firstDigit === '0'
		&& !isOctalDigit(text[index + 2])
	) {
		return;
	}

	if (!isOctalDigit(firstDigit)) {
		return;
	}

	const maximumLength = firstDigit >= '0' && firstDigit <= '3' ? 3 : 2;

	let end = index + 1;
	while (
		end < index + 1 + maximumLength
		&& isOctalDigit(text[end])
	) {
		end++;
	}

	return {
		end,
		replacement: formatCodePointEscape(Number.parseInt(text.slice(index + 1, end), 8)),
	};
}

function getControlEscape(text, index) {
	const character = text[index + 2];
	if (
		text[index + 1] !== 'c'
		|| !isControlLetter(character)
	) {
		return;
	}

	return {
		end: index + 3,
		replacement: formatCodePointEscape(character.toUpperCase().codePointAt(0) % 32),
	};
}

function getHexEscape(text, index) {
	if (text[index + 1] !== 'x') {
		return;
	}

	const value = parseHex(text, index + 2, 2);
	if (value === undefined) {
		return;
	}

	return {
		end: index + 4,
		replacement: formatCodePointEscape(value),
	};
}

function getUnicodeEscape(text, index, {allowSurrogatePair, allowSurrogate}) {
	if (
		text[index + 1] !== 'u'
		|| text[index + 2] === '{'
	) {
		return;
	}

	const value = parseHex(text, index + 2, 4);
	if (value === undefined) {
		return;
	}

	if (
		!allowSurrogate
		&& (isHighSurrogate(value) || isLowSurrogate(value))
	) {
		return;
	}

	const nextEscapeIndex = index + 6;
	if (
		allowSurrogatePair
		&& isHighSurrogate(value)
		&& text[nextEscapeIndex] === BACKSLASH
		&& isActiveBackslash(text, nextEscapeIndex)
		&& text[nextEscapeIndex + 1] === 'u'
	) {
		const nextValue = parseHex(text, nextEscapeIndex + 2, 4);
		if (isLowSurrogate(nextValue)) {
			return {
				end: nextEscapeIndex + 6,
				replacement: formatCodePointEscape(getSurrogatePairCodePoint(value, nextValue)),
			};
		}
	}

	return {
		end: index + 6,
		replacement: formatCodePointEscape(value),
	};
}

function getEscapeReplacement(text, index, {isRegex, isInCharacterClass}) {
	return getHexEscape(text, index)
		?? getUnicodeEscape(text, index, {
			allowSurrogatePair: !isInCharacterClass,
			allowSurrogate: !isRegex || !isInCharacterClass,
		})
		?? (isRegex ? getControlEscape(text, index) : getOctalEscape(text, index));
}

function replaceEscapeSequences(text, {isRegex = false, supportsNestedCharacterClasses = false} = {}) {
	let fixed = '';
	let characterClassDepth = 0;
	let hasReplacement = false;

	for (let index = 0; index < text.length; index++) {
		const character = text[index];
		const isInCharacterClass = characterClassDepth > 0;

		if (
			isRegex
			&& character === '['
			&& (!isInCharacterClass || supportsNestedCharacterClasses)
			&& !isEscapedCharacter(text, index)
		) {
			characterClassDepth++;
			fixed += character;
			continue;
		}

		if (
			isRegex
			&& character === ']'
			&& isInCharacterClass
			&& !isEscapedCharacter(text, index)
		) {
			characterClassDepth--;
			fixed += character;
			continue;
		}

		if (
			character !== BACKSLASH
			|| !isActiveBackslash(text, index)
		) {
			fixed += character;
			continue;
		}

		const replacement = getEscapeReplacement(text, index, {isRegex, isInCharacterClass});
		if (!replacement) {
			fixed += character;
			continue;
		}

		fixed += replacement.replacement;
		index = replacement.end - 1;
		hasReplacement = true;
	}

	return {
		fixed,
		hasReplacement,
	};
}

function hasUnicodeCodePointEscape(text) {
	for (let index = 0; index < text.length; index++) {
		if (
			parseCodePointEscape(text, index) !== undefined
			&& isActiveBackslash(text, index)
		) {
			return true;
		}
	}

	return false;
}

function getStringProblem(node, value, fix) {
	const {fixed, hasReplacement} = replaceEscapeSequences(value);

	if (!hasReplacement) {
		return;
	}

	return {
		node,
		messageId: MESSAGE_ID,
		fix: fixer => fix ? fix(fixer, fixed) : fixer.replaceText(node, fixed),
	};
}

function getRegexLiteralParts(raw) {
	const patternEnd = raw.lastIndexOf('/');

	return {
		pattern: raw.slice(1, patternEnd),
		flags: raw.slice(patternEnd + 1),
	};
}

function addUnicodeFlag(flags) {
	return flags.includes('u') || flags.includes('v') ? flags : `${flags}u`;
}

function isValidRegex(pattern, flags) {
	try {
		// eslint-disable-next-line no-new
		new RegExp(pattern, flags);
		return true;
	} catch {
		return false;
	}
}

function getRegexProblem(node) {
	const {raw} = node;
	const {pattern, flags} = getRegexLiteralParts(raw);
	const {fixed, hasReplacement} = replaceEscapeSequences(pattern, {
		isRegex: true,
		supportsNestedCharacterClasses: flags.includes('v'),
	});
	const hasUnicodeFlag = flags.includes('u') || flags.includes('v');
	const hasCodePointEscape = hasUnicodeCodePointEscape(pattern);

	if (!hasReplacement && (hasUnicodeFlag || !hasCodePointEscape)) {
		return;
	}

	const fixedRegex = `/${hasReplacement ? fixed : pattern}/${addUnicodeFlag(flags)}`;

	if (!hasUnicodeFlag) {
		if (!isValidRegex(hasReplacement ? fixed : pattern, addUnicodeFlag(flags))) {
			return {
				node,
				messageId: MESSAGE_ID,
			};
		}

		return {
			node,
			messageId: MESSAGE_ID,
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: fixer => fixer.replaceText(node, fixedRegex),
				},
			],
		};
	}

	return {
		node,
		messageId: MESSAGE_ID,
		fix: fixer => fixer.replaceText(node, fixedRegex),
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Literal', node => {
		if (isStringLiteral(node)) {
			return getStringProblem(node, node.raw);
		}

		if (isRegexLiteral(node)) {
			return getRegexProblem(node);
		}
	});

	context.on('TemplateElement', node => {
		if (isTaggedTemplateLiteral(node.parent)) {
			return;
		}

		return getStringProblem(node, node.value.raw, (fixer, fixed) => replaceTemplateElement(node, fixed, context, fixer));
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer Unicode code point escapes over legacy escape sequences.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
