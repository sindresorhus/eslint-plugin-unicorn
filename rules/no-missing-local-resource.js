import fs from 'node:fs';
import path from 'node:path';
import {decodeHTMLAttribute} from 'entities';
import {isVirtualFilename} from './utils/index.js';

const MESSAGE_ID_MISSING = 'missing';
const MESSAGE_ID_INCORRECT_CASE = 'incorrect-case';
const messages = {
	[MESSAGE_ID_MISSING]: 'Resource `{{resource}}` does not exist.',
	[MESSAGE_ID_INCORRECT_CASE]: 'Resource path has incorrect casing. Use `{{resource}}`.',
};

const resourceAttributes = new Set([
	'href',
	'poster',
	'src',
	'srcset',
]);

const schemePattern = /^[a-z][\d+\-.a-z]*:/iu;
const maximumHtmlCharacterReferenceLength = 64;
const decimalDigitPattern = /^\d$/u;
const hexadecimalDigitPattern = /^[\da-f]$/iu;

const isWhitespace = character => character.trim() === '';

function getNumericCharacterReferenceEnd(value, index) {
	let end = index + 2;
	const isHexadecimal = value[end]?.toLowerCase() === 'x';
	const digitPattern = isHexadecimal
		? hexadecimalDigitPattern
		: decimalDigitPattern;

	if (isHexadecimal) {
		end++;
	}

	while (digitPattern.test(value[end])) {
		end++;
	}

	return value[end] === ';' ? end + 1 : undefined;
}

function getSrcsetCharacter(value, index) {
	if (value[index] !== '&') {
		return {
			value: value[index],
			end: index + 1,
		};
	}

	let end;
	if (value[index + 1] === '#') {
		end = getNumericCharacterReferenceEnd(value, index);
	} else {
		const possibleCharacterReference = value.slice(index, index + maximumHtmlCharacterReferenceLength);
		const semicolonIndex = possibleCharacterReference.indexOf(';');
		end = semicolonIndex === -1 ? undefined : index + semicolonIndex + 1;
	}

	if (end === undefined) {
		return {
			value: value[index],
			end: index + 1,
		};
	}

	const source = value.slice(index, end);
	const decodedValue = decodeHTMLAttribute(source);
	if (decodedValue === source) {
		return {
			value: value[index],
			end: index + 1,
		};
	}

	return {
		value: decodedValue,
		end,
	};
}

function skipSrcsetSeparators(value, index) {
	while (index < value.length) {
		const character = getSrcsetCharacter(value, index);
		if (character.value !== ',' && !isWhitespace(character.value)) {
			return index;
		}

		index = character.end;
	}

	return value.length;
}

function getSrcsetCandidateEnd(value, index, isDataUrl) {
	while (index < value.length) {
		const character = getSrcsetCharacter(value, index);
		if (isWhitespace(character.value) || (!isDataUrl && character.value === ',')) {
			return index;
		}

		index = character.end;
	}

	return value.length;
}

function getNextSrcsetCandidateStart(value, index) {
	while (index < value.length) {
		const character = getSrcsetCharacter(value, index);
		index = character.end;

		if (character.value === ',') {
			return index;
		}
	}

	return value.length;
}

function isDataUrl(value, index) {
	let prefix = '';

	while (index < value.length && prefix.length < 5) {
		const character = getSrcsetCharacter(value, index);
		prefix += character.value;
		index = character.end;
	}

	return prefix.toLowerCase().startsWith('data:');
}

function getSrcsetCandidates(value) {
	const candidates = [];
	let index = 0;

	while (index < value.length) {
		index = skipSrcsetSeparators(value, index);
		const start = index;
		index = getSrcsetCandidateEnd(value, index, isDataUrl(value, start));

		if (index > start) {
			candidates.push({
				value: value.slice(start, index),
				offsets: [start, index],
			});
		}

		index = getNextSrcsetCandidateStart(value, index);
	}

	return candidates;
}

function getLocalResource(value) {
	const decodedValue = decodeHTMLAttribute(value);
	let pathEnd = decodedValue.length;

	for (const separator of ['?', '#']) {
		const index = decodedValue.indexOf(separator);
		if (index !== -1) {
			pathEnd = Math.min(pathEnd, index);
		}
	}

	const resourcePath = decodedValue.slice(0, pathEnd);

	if (
		resourcePath.length === 0
		|| resourcePath.startsWith('/')
		|| schemePattern.test(resourcePath)
	) {
		return;
	}

	try {
		const decodedParts = resourcePath.split('/').map(part => decodeURIComponent(part));
		if (decodedParts.some(part => part.includes('/') || part.includes(path.sep))) {
			return;
		}

		return {
			path: decodedParts.join('/'),
			rawPath: resourcePath,
			suffix: decodedValue.slice(pathEnd),
			canFix: decodedValue === value,
		};
	} catch {}
}

function getCorrectedResourcePath(rawPath, correctedPath) {
	const correctedParts = correctedPath.split('/');

	return rawPath.split('/').map((part, index) => {
		const correctedPart = correctedParts[index];

		return part.includes('%') && decodeURIComponent(part) !== part
			? encodeURIComponent(correctedPart)
			: correctedPart;
	}).join('/');
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	if (
		context.filename !== context.physicalFilename
		|| isVirtualFilename(context.physicalFilename)
	) {
		return;
	}

	const documentDirectory = path.dirname(context.physicalFilename);
	const resourceCache = new Map();
	const directoryEntriesCache = new Map();

	const getDirectoryEntries = directory => {
		if (directoryEntriesCache.has(directory)) {
			return directoryEntriesCache.get(directory);
		}

		let result;
		try {
			const exact = new Set();
			const insensitive = new Map();

			for (const entry of fs.readdirSync(directory)) {
				exact.add(entry);

				const normalizedEntry = entry.toLowerCase();
				if (insensitive.has(normalizedEntry)) {
					insensitive.set(normalizedEntry, undefined);
				} else {
					insensitive.set(normalizedEntry, entry);
				}
			}

			result = {exact, insensitive};
		} catch {}

		directoryEntriesCache.set(directory, result);
		return result;
	};

	const getResourceResult = resourcePath => {
		if (resourceCache.has(resourcePath)) {
			return resourceCache.get(resourcePath);
		}

		let directory = documentDirectory;
		let hasIncorrectCase = false;
		const correctedParts = [];

		for (const part of resourcePath.split('/')) {
			if (['', '.', '..'].includes(part)) {
				directory += path.sep + part;
				correctedParts.push(part);
				continue;
			}

			const entries = getDirectoryEntries(directory);
			const correctedPart = entries?.exact.has(part) ? part : entries?.insensitive.get(part.toLowerCase());
			if (!correctedPart) {
				const result = {exists: false};
				resourceCache.set(resourcePath, result);
				return result;
			}

			hasIncorrectCase ||= correctedPart !== part;
			correctedParts.push(correctedPart);
			directory += path.sep + correctedPart;
		}

		const result = fs.existsSync(directory)
			? {
				exists: true,
				correctedPath: hasIncorrectCase ? correctedParts.join('/') : undefined,
			}
			: {exists: false};

		resourceCache.set(resourcePath, result);
		return result;
	};

	const getResourceProblem = (node, value, range, canFix = true) => {
		const leadingWhitespaceLength = value.length - value.trimStart().length;
		const resource = value.trim();
		const localResource = getLocalResource(resource);
		if (!localResource) {
			return;
		}

		const resourceRange = [range[0] + leadingWhitespaceLength, range[0] + leadingWhitespaceLength + resource.length];
		const resourceResult = getResourceResult(localResource.path);
		const loc = {
			start: context.sourceCode.getLocFromIndex(resourceRange[0]),
			end: context.sourceCode.getLocFromIndex(resourceRange[1]),
		};

		if (!resourceResult.exists) {
			return {
				node,
				loc,
				messageId: MESSAGE_ID_MISSING,
				data: {resource},
			};
		}

		if (!resourceResult.correctedPath) {
			return;
		}

		const correctedResource = getCorrectedResourcePath(localResource.rawPath, resourceResult.correctedPath) + localResource.suffix;
		return {
			node,
			loc,
			messageId: MESSAGE_ID_INCORRECT_CASE,
			data: {resource: correctedResource},
			...(canFix && localResource.canFix && {
				fix: fixer => fixer.replaceTextRange(resourceRange, correctedResource),
			}),
		};
	};

	const getMarkdownResourceRange = (node, resource) => {
		const range = context.sourceCode.getRange(node);
		const source = context.sourceCode.text.slice(...range);
		let destinationStart = node.type === 'definition'
			? source.indexOf(']:') + 2
			: (source.startsWith('<') ? 1 : source.indexOf('](') + 2);

		while (isWhitespace(source[destinationStart])) {
			destinationStart++;
		}

		if (source[destinationStart] === '<') {
			destinationStart++;
		}

		const resourceOffset = source.indexOf(resource, destinationStart);

		if (resourceOffset === -1) {
			return;
		}

		return [range[0] + resourceOffset, range[0] + resourceOffset + resource.length];
	};

	const checkMarkdownResource = node => {
		const resourceRange = getMarkdownResourceRange(node, node.url);
		return getResourceProblem(node, node.url, resourceRange ?? context.sourceCode.getRange(node), resourceRange !== undefined);
	};

	context.on(['definition', 'image', 'link'], checkMarkdownResource);
	context.on('Attribute', attribute => {
		const name = attribute.key?.value?.toLowerCase();
		if (
			!resourceAttributes.has(name)
			|| attribute.key.parts.length > 0
			|| !attribute.value
			|| attribute.value.parts.length > 0
		) {
			return;
		}

		const {value} = attribute.value;
		const range = context.sourceCode.getRange(attribute.value);
		if (name === 'srcset') {
			return getSrcsetCandidates(value).map(candidate => getResourceProblem(attribute, candidate.value, [range[0] + candidate.offsets[0], range[0] + candidate.offsets[1]]));
		}

		return getResourceProblem(attribute, value, range);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow references to missing local resources.',
			recommended: false,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
			'html/html',
			'markdown/commonmark',
			'markdown/gfm',
		],
	},
};

export default config;
