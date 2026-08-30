import path from 'node:path';
import {isRegExp} from 'node:util/types';
import {
	camelCase,
	kebabCase,
	snakeCase,
	pascalCase,
} from 'change-case';
import {onRoot, isVirtualFilename} from './utils/index.js';

const MESSAGE_ID = 'filename-case';
const MESSAGE_ID_DIRECTORY = 'directory-case';
const MESSAGE_ID_EXTENSION = 'filename-extension';
const messages = {
	[MESSAGE_ID]: 'Filename is not in {{chosenCases}}. Rename it to {{renamedFilenames}}.',
	[MESSAGE_ID_DIRECTORY]: 'Directory name `{{directory}}` is not in {{chosenCases}}. Rename it to {{renamedDirectories}}.',
	[MESSAGE_ID_EXTENSION]: 'File extension `{{extension}}` is not in lowercase. Rename it to `{{filename}}`.',
};

const isIgnoredChar = char => !/^[\w-]$/.test(char);
const ignoredByDefault = new Set(['index.js', 'index.mjs', 'index.cjs', 'index.ts', 'index.tsx', 'index.vue']);
const isLowerCase = string => string === string.toLowerCase();
const disjunctionListFormat = new Intl.ListFormat('en-US', {type: 'disjunction'});
const alphanumericRegex = /^[\da-z]+$/i;
const leadingAcronymRegex = /^[A-Z]{3,}(?=\d*[A-Z](?:[a-z]|\d+[a-z]))/;

const isAsciiDigit = char => char >= '0' && char <= '9';
const isAsciiLowercaseLetter = char => char >= 'a' && char <= 'z';
const isAsciiUppercaseLetter = char => char >= 'A' && char <= 'Z';

function camelCaseWithoutAcronyms(string) {
	return camelCase(camelCase(string));
}

function camelCaseWithAcronyms(string) {
	if (isCamelCaseWithAcronyms(string)) {
		return string;
	}

	const converted = camelCase(string);

	if (isCamelCaseWithAcronyms(converted)) {
		return converted;
	}

	return camelCase(converted);
}

function isCamelCaseWithAcronyms(string) {
	if (!isAsciiLowercaseLetter(string[0])) {
		return false;
	}

	for (let index = 1; index < string.length; index++) {
		const char = string[index];

		if (isAsciiLowercaseLetter(char) || isAsciiDigit(char)) {
			continue;
		}

		if (!isAsciiUppercaseLetter(char)) {
			return false;
		}

		const uppercaseStartIndex = index;

		while (isAsciiUppercaseLetter(string[index + 1])) {
			index++;
		}

		if (index === uppercaseStartIndex) {
			continue;
		}

		if (isAsciiLowercaseLetter(string[index + 1])) {
			index--;
			continue;
		}

		while (isAsciiDigit(string[index + 1])) {
			index++;
		}

		if (index === string.length - 1) {
			return true;
		}

		if (!isAsciiUppercaseLetter(string[index + 1])) {
			return false;
		}
	}

	return true;
}

function hasValidLeadingAcronym(string) {
	if (!alphanumericRegex.test(string)) {
		return false;
	}

	const leadingAcronym = leadingAcronymRegex.exec(string)?.[0];
	const suffix = leadingAcronym && string.slice(leadingAcronym.length);

	return Boolean(suffix && pascalCase(suffix) === suffix);
}

function pascalCaseWithLeadingAcronym(string) {
	if (hasValidLeadingAcronym(string)) {
		return string;
	}

	const converted = pascalCase(string);

	if (hasValidLeadingAcronym(converted)) {
		return converted;
	}

	return pascalCase(converted);
}

const cases = {
	camelCase: {
		fn: camelCaseWithoutAcronyms,
		name: 'camel case',
	},
	camelCaseWithAcronyms: {
		fn: camelCaseWithAcronyms,
		name: 'camel case with acronyms',
	},
	kebabCase: {
		fn: kebabCase,
		name: 'kebab case',
	},
	snakeCase: {
		fn: snakeCase,
		name: 'snake case',
	},
	pascalCase: {
		fn: pascalCaseWithLeadingAcronym,
		name: 'pascal case',
	},
};

/**
Get the cases specified by the option.

@param {object} options
@returns {string[]} The chosen cases.
*/
function getChosenCases(options) {
	if (options.case) {
		return [options.case];
	}

	if (options.cases) {
		const chosenCases = Object.keys(options.cases)
			.filter(caseName => options.cases[caseName]);

		return chosenCases.length > 0 ? chosenCases : ['kebabCase'];
	}

	return ['kebabCase'];
}

function isValidName(words, caseFunctions) {
	return words
		.filter(({ignored}) => !ignored)
		.every(({word}) => caseFunctions.some(caseFunction => caseFunction(word) === word));
}

function getRenamedNames(words, caseFunctions, {leading, trailing}) {
	const names = caseFunctions.map(caseFunction => {
		const name = words
			.map(({word, ignored}) => ignored ? word : caseFunction(word))
			.join('');

		return `${leading}${name}${trailing}`;
	});

	return [...new Set(names)];
}

function getFilenameParts(basename, {multipleFileExtensions}) {
	const extension = path.extname(basename);
	const filename = path.basename(basename, extension);

	const parts = {
		filename,
		additionalExtensions: '',
		extension,
	};

	if (multipleFileExtensions) {
		const [firstPart] = filename.split('.', 1);
		Object.assign(parts, {
			filename: firstPart,
			additionalExtensions: filename.slice(firstPart.length),
		});
	}

	return parts;
}

function isInsideCwd(relativePath) {
	return relativePath !== ''
		&& relativePath !== '..'
		&& !relativePath.startsWith(`..${path.sep}`)
		&& !path.isAbsolute(relativePath);
}

function getPathSegments(filePath, cwd) {
	const relativePath = path.relative(cwd, path.resolve(cwd, filePath));

	if (!isInsideCwd(relativePath)) {
		return [path.basename(filePath)];
	}

	return relativePath
		.split(path.sep)
		.filter(segment => segment !== '.');
}

function validatePatternOption(optionName, patterns) {
	if (patterns.some(pattern => typeof pattern !== 'string' && !isRegExp(pattern))) {
		throw new TypeError(`The \`${optionName}\` option only accepts strings and regular expressions.`);
	}
}

function isDirectoryRoot(directoryPath, directoryRoots) {
	return directoryRoots.some(directoryRoot => {
		if (typeof directoryRoot === 'string') {
			return directoryPath === directoryRoot;
		}

		const regexp = new RegExp(directoryRoot);
		return regexp.test(directoryPath);
	});
}

function getDirectoriesToCheck(pathSegments, directoryRoots) {
	const directories = pathSegments.slice(0, -1);
	let directoryPath = '';
	let directoryStartIndex = 0;

	for (const [index, directory] of directories.entries()) {
		directoryPath = directoryPath ? `${directoryPath}/${directory}` : directory;

		if (isDirectoryRoot(directoryPath, directoryRoots)) {
			directoryStartIndex = index + 1;
		}
	}

	return directories.slice(directoryStartIndex);
}

const leadingUnderscoresRegex = /^_+/;
function splitName(name) {
	const leading = leadingUnderscoresRegex.exec(name)?.[0] ?? '';
	const remainder = name.slice(leading.length);

	const words = [];

	let lastWord;
	for (const char of remainder) {
		const isIgnored = isIgnoredChar(char);

		if (lastWord?.ignored === isIgnored) {
			lastWord.word += char;
		} else {
			lastWord = {
				word: char,
				ignored: isIgnored,
			};
			words.push(lastWord);
		}
	}

	return {
		leading,
		words,
	};
}

/**
Turns `[a, b, c]` into `a, b, or c`.

@param {string[]} words
@returns {string}
*/
const formatDisjunction = words => disjunctionListFormat.format(words);

function formatCaseNames(chosenCases) {
	return formatDisjunction(chosenCases.map(caseName => cases[caseName].name));
}

function getInvalidDirectoryReport(directory, chosenCases, chosenCaseFunctions) {
	const {leading, words} = splitName(directory);

	if (directory.startsWith('$') || isValidName(words, chosenCaseFunctions)) {
		return;
	}

	const renamedDirectories = getRenamedNames(words, chosenCaseFunctions, {
		leading,
		trailing: '',
	});

	return {
		loc: {column: 0, line: 1},
		messageId: MESSAGE_ID_DIRECTORY,
		data: {
			directory,
			chosenCases: formatCaseNames(chosenCases),
			renamedDirectories: formatDisjunction(renamedDirectories.map(directory => `\`${directory}\``)),
		},
	};
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const options = context.options[0] || {};
	const ignorePatterns = options.ignore || [];
	const directoryRoots = options.directoryRoots || [];

	validatePatternOption('ignore', ignorePatterns);
	validatePatternOption('directoryRoots', directoryRoots);
	const ignoreRegexps = ignorePatterns.map(pattern => {
		if (isRegExp(pattern)) {
			return new RegExp(pattern);
		}

		return new RegExp(pattern, 'u');
	});

	const {physicalFilename} = context;

	if (context.filename !== physicalFilename || isVirtualFilename(physicalFilename)) {
		return;
	}

	const chosenCases = getChosenCases(options);
	const isMultipleFileExtensions = options.multipleFileExtensions !== false;
	const isCheckDirectories = options.checkDirectories !== false;
	const chosenCaseFunctions = chosenCases.map(caseName => cases[caseName].fn);

	onRoot(context, () => {
		const pathSegments = getPathSegments(physicalFilename, context.cwd);
		const basename = pathSegments.at(-1);
		const {
			filename,
			additionalExtensions,
			extension,
		} = getFilenameParts(basename, {multipleFileExtensions: isMultipleFileExtensions});

		if (pathSegments.some(segment => ignoreRegexps.some(regexp => regexp.test(segment)))) {
			return;
		}

		if (isCheckDirectories) {
			for (const directory of getDirectoriesToCheck(pathSegments, directoryRoots)) {
				const report = getInvalidDirectoryReport(directory, chosenCases, chosenCaseFunctions);

				if (report) {
					return report;
				}
			}
		}

		if (ignoredByDefault.has(basename)) {
			return;
		}

		const {leading, words} = splitName(filename);
		const isValid = filename.startsWith('$') || isValidName(words, chosenCaseFunctions);

		if (isValid) {
			if (!isLowerCase(extension)) {
				return {
					loc: {column: 0, line: 1},
					messageId: MESSAGE_ID_EXTENSION,
					data: {filename: filename + additionalExtensions + extension.toLowerCase(), extension},
				};
			}

			return;
		}

		const renamedFilenames = getRenamedNames(words, chosenCaseFunctions, {
			leading,
			trailing: additionalExtensions + extension.toLowerCase(),
		});

		return {
			// Report on first character like `unicode-bom` rule
			// https://github.com/eslint/eslint/blob/8a77b661bc921c3408bae01b3aa41579edfc6e58/lib/rules/unicode-bom.js#L46
			loc: {column: 0, line: 1},
			messageId: MESSAGE_ID,
			data: {
				chosenCases: formatCaseNames(chosenCases),
				renamedFilenames: formatDisjunction(renamedFilenames.map(filename => `\`${filename}\``)),
			},
		};
	});
};

const commonOptionProperties = {
	ignore: {
		type: 'array',
		items: {
			type: ['string', 'object'],
			additionalProperties: true,
		},
		uniqueItems: true,
		description: 'Path segment patterns to ignore.',
	},
	multipleFileExtensions: {
		type: 'boolean',
		description: 'Whether to treat additional, dot-separated parts of a filename as file extensions.',
	},
	checkDirectories: {
		type: 'boolean',
		description: 'Whether to check directory names.',
	},
	directoryRoots: {
		type: 'array',
		items: {
			type: ['string', 'object'],
			additionalProperties: true,
		},
		uniqueItems: true,
		description: 'Directory root paths or patterns, relative to the current working directory.',
	},
};

const schema = [
	{
		description: 'The rule options.',
		anyOf: [
			{
				type: 'object',
				properties: {
					case: {
						enum: [
							'camelCase',
							'camelCaseWithAcronyms',
							'snakeCase',
							'kebabCase',
							'pascalCase',
						],
						description: 'The filename and directory name case style.',
					},
					...commonOptionProperties,
				},
				additionalProperties: false,
			},
			{
				type: 'object',
				properties: {
					cases: {
						type: 'object',
						properties: {
							camelCase: {
								type: 'boolean',
								description: 'Whether to allow camelCase filenames and directory names.',
							},
							camelCaseWithAcronyms: {
								type: 'boolean',
								description: 'Whether to allow camelCase filenames and directory names with acronym segments.',
							},
							snakeCase: {
								type: 'boolean',
								description: 'Whether to allow snake_case filenames and directory names.',
							},
							kebabCase: {
								type: 'boolean',
								description: 'Whether to allow kebab-case filenames and directory names.',
							},
							pascalCase: {
								type: 'boolean',
								description: 'Whether to allow PascalCase filenames and directory names.',
							},
						},
						additionalProperties: false,
						description: 'The allowed filename and directory name case styles.',
					},
					...commonOptionProperties,
				},
				additionalProperties: false,
			},
		],
	},
];

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce a case style for filenames and directory names.',
			recommended: true,
		},
		schema,
		// eslint-disable-next-line eslint-plugin/require-meta-default-options
		defaultOptions: [],
		messages,
		languages: [
			'*',
		],
	},
};

export default config;
