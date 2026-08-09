const maskCharacter = '\u{FFFF}';
const quoteCharacters = '"\'`';
const jsdocTagPattern = /^\s*\*?\s*(?<tag>@[\d\p{Letter}][\d\p{Letter}\-]*!?)(?=\s|$)/v;
const jsdocTypeAndNameTagNames = new Set(['param', 'arg', 'argument', 'property', 'prop', 'typedef', 'callback', 'member', 'var', 'const', 'constant', 'class', 'constructor', 'module', 'namespace']);
const jsdocStructuredTypeTagNames = new Set(['type', 'this', 'extends', 'augments', 'implements', 'satisfies', 'import', 'package', 'enum']);
const jsdocTypeTagNames = new Set(['returns', 'return', 'throws', 'exception', 'yields', 'yield']);
const jsdocNameTagNames = new Set([
	'access',
	'alias',
	'constructs',
	'function',
	'method',
	'event',
	'emits',
	'external',
	'exports',
	'fires',
	'func',
	'global',
	'host',
	'inner',
	'instance',
	'interface',
	'kind',
	'lends',
	'listens',
	'memberof',
	'mixes',
	'mixin',
	'name',
	'requires',
	'see',
	'template',
	'tutorial',
	'variation',
]);
const jsdocMetadataTagNames = new Set(['author', 'borrows', 'copyright', 'license', 'version', 'since', 'date', 'created', 'modified', 'default', 'defaultvalue']);
const jsdocClosingCharacters = {'{': '}', '[': ']', '(': ')'};
const jsdocInlineTagPattern = /\{\s*(?<tag>@(?:link|linkcode|linkplain|tutorial|inheritdoc))(?=\s|\})/giv;
const jsdocInlineTagStartPattern = /^\{\s*@(?:link|linkcode|linkplain|tutorial|inheritdoc)(?=\s|\})/iv;

function getLineEndIndex(text, index) {
	const lineEnd = text.indexOf('\n', index);

	return lineEnd === -1 ? text.length : lineEnd;
}

function maskRange(characters, start, end) {
	for (let index = start; index < end; index++) {
		if (characters[index] !== '\n') {
			characters[index] = maskCharacter;
		}
	}
}

function skipJSDocumentHorizontalWhitespace(text, start, end) {
	while (start < end && /[^\S\n]/v.test(text[start])) {
		start++;
	}

	return start;
}

function skipJSDocumentTemplateWhitespace(text, start, end) {
	while (start < end) {
		start = skipJSDocumentHorizontalWhitespace(text, start, end);
		if (text[start] !== '\n') {
			return start;
		}

		start++;
		start = skipJSDocumentHorizontalWhitespace(text, start, end);
		if (text[start] === '*') {
			start++;
		}
	}

	return start;
}

function getJSDocumentDelimitedEnd(text, start, end, opening) {
	const closing = jsdocClosingCharacters[opening];
	let depth = 0;
	let quote;

	for (let index = start; index < end; index++) {
		const character = text[index];

		if (quote) {
			if (character === '\\') {
				index++;
				continue;
			}

			if (character === quote) {
				quote = undefined;
			}

			continue;
		}

		if (quoteCharacters.includes(character)) {
			quote = character;
			continue;
		}

		if (character === opening) {
			depth++;
		} else if (character === closing) {
			depth--;
			if (depth === 0) {
				return index + 1;
			}
		}
	}
}

function getJSDocumentValueEnd(text, start, end) {
	const opening = text[start];
	const closing = jsdocClosingCharacters[opening];

	if (closing) {
		return getJSDocumentDelimitedEnd(text, start, end, opening);
	}

	if (quoteCharacters.includes(opening)) {
		for (let index = start + 1; index < end; index++) {
			if (text[index] === '\\') {
				index++;
				continue;
			}

			if (text[index] === opening) {
				return index + 1;
			}
		}

		return;
	}

	let index = start;
	while (index < end && !/\s/v.test(text[index])) {
		index++;
	}

	return index;
}

function maskJSDocumentValue(characters, text, start, end) {
	start = skipJSDocumentHorizontalWhitespace(text, start, end);
	if (start >= end || text[start] === '-') {
		return start;
	}

	const valueEnd = getJSDocumentValueEnd(text, start, end);
	if (valueEnd === undefined) {
		return start;
	}

	maskRange(characters, start, valueEnd);

	return valueEnd;
}

function maskJSDocumentType(characters, text, start, end) {
	start = skipJSDocumentHorizontalWhitespace(text, start, end);
	if (text[start] !== '{') {
		return start;
	}

	const typeEnd = getJSDocumentDelimitedEnd(text, start, end, '{');
	if (typeEnd === undefined) {
		return start;
	}

	maskRange(characters, start, typeEnd);

	return typeEnd;
}

function maskJSDocumentTypeOrValue(characters, text, start, end) {
	const valueStart = skipJSDocumentHorizontalWhitespace(text, start, end);
	const typeEnd = maskJSDocumentType(characters, text, valueStart, end);

	if (typeEnd === valueStart) {
		maskJSDocumentValue(characters, text, valueStart, end);
	}
}

function maskJSDocumentTypeAndName(characters, text, start, end) {
	let valueStart = skipJSDocumentHorizontalWhitespace(text, start, end);

	if (text[valueStart] === '{') {
		const typeEnd = maskJSDocumentType(characters, text, valueStart, end);
		if (typeEnd === valueStart) {
			return;
		}

		valueStart = skipJSDocumentHorizontalWhitespace(text, typeEnd, end);
	}

	maskJSDocumentValue(characters, text, valueStart, end);
}

function maskJSDocumentNameList(characters, text, start, end) {
	let valueEnd = maskJSDocumentValue(characters, text, start, end);
	if (text[valueEnd - 1] === ',') {
		valueEnd--;
	}

	while (valueEnd < end) {
		const commaStart = skipJSDocumentTemplateWhitespace(text, valueEnd, end);
		if (text[commaStart] !== ',') {
			return;
		}

		const nameStart = skipJSDocumentTemplateWhitespace(text, commaStart + 1, end);
		valueEnd = maskJSDocumentValue(characters, text, nameStart, end);
	}
}

function maskJSDocumentTemplate(characters, text, start, end) {
	let nameStart = skipJSDocumentHorizontalWhitespace(text, start, end);

	if (text[nameStart] === '{') {
		const typeEnd = maskJSDocumentType(characters, text, nameStart, end);
		if (typeEnd === nameStart) {
			return;
		}

		nameStart = skipJSDocumentTemplateWhitespace(text, typeEnd, end);
	}

	maskJSDocumentNameList(characters, text, nameStart, end);
}

function getJSDocumentInlineTagEnd(text, start, end) {
	let quote;
	let targetEnd;
	let hasTarget;

	for (let index = start; index < end; index++) {
		const character = text[index];

		if (character === '\\') {
			index++;
			continue;
		}

		if (quote) {
			if (character === quote) {
				quote = undefined;
			}

			continue;
		}

		if (quoteCharacters.includes(character)) {
			quote = character;
			hasTarget = true;
		} else if (character === '|' && targetEnd === undefined) {
			targetEnd = index;
		} else if (/\s/v.test(character)) {
			if (hasTarget && targetEnd === undefined) {
				targetEnd = index;
			}
		} else if (character === '}') {
			return {
				targetEnd: targetEnd ?? index,
				end: index,
			};
		} else {
			hasTarget = true;
		}
	}

	return {
		targetEnd: targetEnd ?? end,
		end,
	};
}

function maskJSDocumentInlineTagSyntax(characters, text) {
	jsdocInlineTagPattern.lastIndex = 0;
	let match;
	while ((match = jsdocInlineTagPattern.exec(text))) {
		const tagStart = match.index + match[0].indexOf(match.groups.tag);
		maskRange(characters, tagStart, tagStart + match.groups.tag.length);

		const valueStart = match.index + match[0].length;
		const {targetEnd, end: inlineTagEnd} = getJSDocumentInlineTagEnd(text, valueStart, getLineEndIndex(text, match.index));

		maskRange(characters, valueStart, targetEnd);
		jsdocInlineTagPattern.lastIndex = inlineTagEnd + 1;
	}
}

function getJSDocumentTag(text, start, end) {
	const match = jsdocTagPattern.exec(text.slice(start, end));
	if (!match) {
		return;
	}

	const tagStart = start + match[0].indexOf(match.groups.tag);

	return {
		name: match.groups.tag.slice(1).toLowerCase().replace(/!$/v, ''),
		tagStart,
		tagEnd: tagStart + match.groups.tag.length,
		contentStart: start + match[0].length,
	};
}

function maskJSDocumentTagSyntax(characters, text) {
	const tags = [];
	let lineStart = 0;

	while (lineStart < text.length) {
		const lineEnd = getLineEndIndex(text, lineStart);
		const tag = getJSDocumentTag(text, lineStart, lineEnd);

		if (tag) {
			tags.push({tag, lineStart, lineEnd});
		}

		lineStart = lineEnd + 1;
	}

	for (const [index, {tag, lineEnd}] of tags.entries()) {
		const tagEnd = tags[index + 1]?.lineStart ?? text.length;
		maskRange(characters, tag.tagStart, tag.tagEnd);

		if (jsdocTypeAndNameTagNames.has(tag.name)) {
			maskJSDocumentTypeAndName(characters, text, tag.contentStart, tagEnd);
		} else if (jsdocStructuredTypeTagNames.has(tag.name)) {
			maskJSDocumentTypeOrValue(characters, text, tag.contentStart, tagEnd);
		} else if (jsdocTypeTagNames.has(tag.name)) {
			maskJSDocumentType(characters, text, tag.contentStart, tagEnd);
		} else if (tag.name === 'see') {
			maskJSDocumentSeeValue(characters, text, tag.contentStart, lineEnd);
		} else if (jsdocNameTagNames.has(tag.name)) {
			if (tag.name === 'template') {
				maskJSDocumentTemplate(characters, text, tag.contentStart, tagEnd);
			} else {
				maskJSDocumentValue(characters, text, tag.contentStart, lineEnd);
			}
		} else if (jsdocMetadataTagNames.has(tag.name)) {
			maskRange(characters, tag.contentStart, lineEnd);
		}
	}
}

function maskJSDocumentSeeValue(characters, text, start, end) {
	const valueStart = skipJSDocumentHorizontalWhitespace(text, start, end);
	const valueEnd = getJSDocumentValueEnd(text, valueStart, end);
	if (valueEnd === undefined) {
		return;
	}

	if (jsdocInlineTagStartPattern.test(text.slice(valueStart, valueEnd))) {
		return;
	}

	const remainderStart = skipJSDocumentHorizontalWhitespace(text, valueEnd, end);

	if (remainderStart < end && text[remainderStart] !== '-') {
		return;
	}

	maskRange(characters, valueStart, valueEnd);
}

export default function maskJSDocumentSyntax(characters, text) {
	maskJSDocumentTagSyntax(characters, text);
	maskJSDocumentInlineTagSyntax(characters, text);
}
