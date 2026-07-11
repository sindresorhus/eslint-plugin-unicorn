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
const maximumNamedHtmlCharacterReferenceLength = 64;
const decimalDigitPattern = /^\d$/u;
const hexadecimalDigitPattern = /^[\da-f]$/iu;
const unquotedAttributeValuePattern = /^[^\t\n\f\r "'<>`]+/u;

const isSrcsetWhitespace = character => /^[\t\n\f\r ]$/u.test(character);

function getTrimmedUrlRange(value) {
	let start = 0;
	let end = value.length;

	while (start < end && value.codePointAt(start) <= 32) {
		start++;
	}

	while (end > start && value.codePointAt(end - 1) <= 32) {
		end--;
	}

	return [start, end];
}

function decodePercentEncoded(value) {
	try {
		return decodeURIComponent(value);
	} catch {
		return value.replaceAll(/(?:%[\da-f]{2})+/giu, encoded => {
			try {
				return decodeURIComponent(encoded);
			} catch {
				return encoded;
			}
		});
	}
}

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
		const possibleCharacterReference = value.slice(index, index + maximumNamedHtmlCharacterReferenceLength);
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
		if (character.value !== ',' && !isSrcsetWhitespace(character.value)) {
			return index;
		}

		index = character.end;
	}

	return value.length;
}

function getSrcsetCandidateEnd(value, index, isDataUrl) {
	while (index < value.length) {
		const character = getSrcsetCharacter(value, index);
		if (isSrcsetWhitespace(character.value) || (!isDataUrl && character.value === ',')) {
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

function getLocalResource(value, decodeHtmlCharacterReferences = true) {
	const decodedValue = decodeHtmlCharacterReferences ? decodeHTMLAttribute(value) : value;
	const [resourceStart, resourceEnd] = getTrimmedUrlRange(decodedValue);
	const trimmedValue = decodedValue.slice(resourceStart, resourceEnd);
	let pathEnd = trimmedValue.length;

	for (const separator of ['?', '#']) {
		const index = trimmedValue.indexOf(separator);
		if (index !== -1) {
			pathEnd = Math.min(pathEnd, index);
		}
	}

	const resourcePath = trimmedValue.slice(0, pathEnd);

	if (
		resourcePath.length === 0
		|| resourcePath.startsWith('/')
		|| schemePattern.test(resourcePath)
	) {
		return;
	}

	const decodedParts = resourcePath.split('/').map(part => decodePercentEncoded(part));
	if (decodedParts.some(part => part.includes('/') || part.includes(path.sep))) {
		return;
	}

	const decodedPath = decodedParts.join('/');
	const normalizedPath = path.posix.normalize(decodedPath);
	const resolvedPath = resourcePath.startsWith('./') && !normalizedPath.startsWith('.')
		? './' + normalizedPath
		: normalizedPath;
	const isNormalized = resolvedPath !== decodedPath;

	return {
		path: resolvedPath,
		rawPath: resourcePath,
		suffix: trimmedValue.slice(pathEnd),
		canFix: decodedValue === value && !isNormalized,
		isNormalized,
	};
}

function getCorrectedResourcePath(rawPath, correctedPath) {
	const correctedParts = correctedPath.split('/');

	return rawPath.split('/').map((part, index) => {
		const correctedPart = correctedParts[index];

		return part.includes('%') && decodePercentEncoded(part) !== part
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
	const templateDelimiters = Object.keys(context.languageOptions?.templateEngineSyntax ?? {});
	const getHtmlAttributeValue = attribute => {
		const range = context.sourceCode.getRange(attribute.value);
		if (attribute.startWrapper) {
			return {value: attribute.value.value, valueRange: range};
		}

		const value = context.sourceCode.text.slice(range[0]).match(unquotedAttributeValuePattern)?.[0];
		if (!value) {
			return;
		}

		return {
			value,
			valueRange: [range[0], range[0] + value.length],
		};
	};

	const getCssValueRange = (node, value) => {
		const range = context.sourceCode.getRange(node);
		const text = context.sourceCode.text.slice(...range);
		let valueOffset = node.type === 'Url' ? text.indexOf('(') + 1 : 0;
		valueOffset += getTrimmedUrlRange(text.slice(valueOffset))[0];
		const quote = text[valueOffset];
		if (quote === '"' || quote === '\'') {
			valueOffset++;
			if (text[valueOffset + value.length] !== quote) {
				return;
			}
		}

		if (!text.startsWith(value, valueOffset)) {
			return;
		}

		return [range[0] + valueOffset, range[0] + valueOffset + value.length];
	};

	const isCssResourceUrl = node => {
		const ancestors = context.sourceCode.getAncestors(node);
		const preludeIndex = ancestors.findLastIndex(ancestor => ancestor.type === 'AtrulePrelude');

		if (preludeIndex === -1) {
			return true;
		}

		const atRule = ancestors[preludeIndex - 1];
		return atRule?.name?.toLowerCase() === 'import' && atRule.prelude.children.at(0) === node;
	};

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

		const resource = path.resolve(documentDirectory, resourcePath);
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
			if (!entries) {
				const result = {exists: fs.existsSync(resource)};
				resourceCache.set(resourcePath, result);
				return result;
			}

			const correctedPart = entries.exact.has(part) ? part : entries.insensitive.get(part.toLowerCase());
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

	const getResourceProblem = (node, value, valueRange, decodeHtmlCharacterReferences = true) => {
		if (templateDelimiters.some(delimiter => value.includes(delimiter))) {
			return;
		}

		const [leadingWhitespaceLength, resourceEnd] = getTrimmedUrlRange(value);
		const resource = value.slice(leadingWhitespaceLength, resourceEnd);
		const localResource = getLocalResource(resource, decodeHtmlCharacterReferences);
		if (!localResource) {
			return;
		}

		const resourceRange = valueRange && [valueRange[0] + leadingWhitespaceLength, valueRange[0] + leadingWhitespaceLength + resource.length];
		const resourceResult = getResourceResult(localResource.path);
		const loc = resourceRange && {
			start: context.sourceCode.getLocFromIndex(resourceRange[0]),
			end: context.sourceCode.getLocFromIndex(resourceRange[1]),
		};

		if (!resourceResult.exists) {
			return {
				node,
				...(loc && {loc}),
				messageId: MESSAGE_ID_MISSING,
				data: {resource},
			};
		}

		if (!resourceResult.correctedPath) {
			return;
		}

		const correctedPath = localResource.isNormalized
			? resourceResult.correctedPath
			: getCorrectedResourcePath(localResource.rawPath, resourceResult.correctedPath);
		const correctedResource = correctedPath + localResource.suffix;
		return {
			node,
			...(loc && {loc}),
			messageId: MESSAGE_ID_INCORRECT_CASE,
			data: {resource: correctedResource},
			...(localResource.canFix && resourceRange && {
				fix: fixer => fixer.replaceTextRange(resourceRange, correctedResource),
			}),
		};
	};

	context.on(['definition', 'image', 'link'], node => getResourceProblem(node, node.url));
	context.on('Atrule', node => {
		if (node.name?.toLowerCase() !== 'import') {
			return;
		}

		const stringNode = node.prelude?.children?.at(0);
		if (stringNode?.type !== 'String') {
			return;
		}

		return getResourceProblem(stringNode, stringNode.value, getCssValueRange(stringNode, stringNode.value), false);
	});
	context.on('Url', node => {
		if (!isCssResourceUrl(node)) {
			return;
		}

		return getResourceProblem(node, node.value, getCssValueRange(node, node.value), false);
	});
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

		const htmlAttributeValue = getHtmlAttributeValue(attribute);
		if (!htmlAttributeValue) {
			return;
		}

		const {value, valueRange} = htmlAttributeValue;
		if (name === 'srcset') {
			return getSrcsetCandidates(value).map(candidate => getResourceProblem(attribute, candidate.value, [valueRange[0] + candidate.offsets[0], valueRange[0] + candidate.offsets[1]]));
		}

		return getResourceProblem(attribute, value, valueRange);
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
			'css/css',
			'html/html',
			'markdown/commonmark',
			'markdown/gfm',
		],
	},
};

export default config;
