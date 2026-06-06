import path from 'node:path';
import {isRegExp} from 'node:util/types';
import {
	camelCase,
	kebabCase,
	snakeCase,
	pascalCase,
} from 'change-case';
import cartesianProductSamples from './utils/cartesian-product-samples.js';

const MESSAGE_ID = 'filename-case';
const MESSAGE_ID_DIRECTORY = 'directory-case';
const MESSAGE_ID_EXTENSION = 'filename-extension';
const messages = {
	[MESSAGE_ID]: 'Filename is not in {{chosenCases}}. Rename it to {{renamedFilenames}}.',
	[MESSAGE_ID_DIRECTORY]: 'Directory name `{{directory}}` is not in {{chosenCases}}. Rename it to {{renamedDirectories}}.',
	[MESSAGE_ID_EXTENSION]: 'File extension `{{extension}}` is not in lowercase. Rename it to `{{filename}}`.',
};

const isIgnoredChar = char => !/^[a-z\d-_]$/i.test(char);
const ignoredByDefault = new Set(['index.js', 'index.mjs', 'index.cjs', 'index.ts', 'index.tsx', 'index.vue']);
const isLowerCase = string => string === string.toLowerCase();

const cases = {
	camelCase: {
		fn: camelCase,
		name: 'camel case',
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
		fn: pascalCase,
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
		const cases = Object.keys(options.cases)
			.filter(cases => options.cases[cases]);

		return cases.length > 0 ? cases : ['kebabCase'];
	}

	return ['kebabCase'];
}

function validateName(words, caseFunctions) {
	return words
		.filter(({ignored}) => !ignored)
		.every(({word}) => caseFunctions.some(caseFunction => caseFunction(word) === word));
}

function fixName(words, caseFunctions, {leading, trailing}) {
	const replacements = words
		.map(({word, ignored}) => ignored ? [word] : caseFunctions.map(caseFunction => caseFunction(word)));

	const {
		samples: combinations,
	} = cartesianProductSamples(replacements);

	return [...new Set(combinations.map(parts => `${leading}${parts.join('')}${trailing}`))];
}

function getFilenameParts(filenameWithExtension, {multipleFileExtensions}) {
	const extension = path.extname(filenameWithExtension);
	const filename = path.basename(filenameWithExtension, extension);
	const basename = filename + extension;

	const parts = {
		basename,
		filename,
		middle: '',
		extension,
	};

	if (multipleFileExtensions) {
		const [firstPart] = filename.split('.');
		Object.assign(parts, {
			filename: firstPart,
			middle: filename.slice(firstPart.length),
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

function getPathSegments(filenameWithExtension, cwd) {
	const relativePath = path.relative(cwd, path.resolve(cwd, filenameWithExtension));

	if (!isInsideCwd(relativePath)) {
		return [path.basename(filenameWithExtension)];
	}

	return relativePath
		.split(path.sep)
		.filter(segment => segment !== '.');
}

const leadingUnderscoresRegex = /^(?<leading>_+)(?<tailing>.*)$/;
function splitName(name) {
	const result = leadingUnderscoresRegex.exec(name) || {groups: {}};
	const {leading = '', tailing = name} = result.groups;

	const words = [];

	let lastWord;
	for (const char of tailing) {
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
const englishishJoinWords = words => new Intl.ListFormat('en-US', {type: 'disjunction'}).format(words);

function getCaseNames(chosenCases) {
	return englishishJoinWords(chosenCases.map(x => cases[x].name));
}

function getInvalidDirectoryReport(directory, chosenCases, chosenCasesFunctions) {
	const {leading, words} = splitName(directory);

	if (directory.startsWith('$') || validateName(words, chosenCasesFunctions)) {
		return;
	}

	const renamedDirectories = fixName(words, chosenCasesFunctions, {
		leading,
		trailing: '',
	});

	return {
		loc: {column: 0, line: 1},
		messageId: MESSAGE_ID_DIRECTORY,
		data: {
			directory,
			chosenCases: getCaseNames(chosenCases),
			renamedDirectories: englishishJoinWords(renamedDirectories.map(x => `\`${x}\``)),
		},
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const options = context.options[0] || {};
	const chosenCases = getChosenCases(options);
	const ignore = (options.ignore || []).map(item => {
		if (isRegExp(item)) {
			return item;
		}

		return new RegExp(item, 'u');
	});
	const multipleFileExtensions = options.multipleFileExtensions !== false;
	const checkDirectories = options.checkDirectories !== false;
	const chosenCasesFunctions = chosenCases.map(case_ => cases[case_].fn);
	const filenameWithExtension = context.physicalFilename;

	if (filenameWithExtension === '<input>' || filenameWithExtension === '<text>') {
		return;
	}

	context.on('Program', () => {
		const pathSegments = getPathSegments(filenameWithExtension, context.cwd);
		const basenameWithExtension = pathSegments.at(-1);
		const {
			basename,
			filename,
			middle,
			extension,
		} = getFilenameParts(basenameWithExtension, {multipleFileExtensions});

		if (pathSegments.some(segment => ignore.some(regexp => regexp.test(segment)))) {
			return;
		}

		if (checkDirectories) {
			for (const directory of pathSegments.slice(0, -1)) {
				const report = getInvalidDirectoryReport(directory, chosenCases, chosenCasesFunctions);

				if (report) {
					return report;
				}
			}
		}

		if (ignoredByDefault.has(basename)) {
			return;
		}

		const {leading, words} = splitName(filename);
		const isValid = filename.startsWith('$') || validateName(words, chosenCasesFunctions);

		if (isValid) {
			if (!isLowerCase(extension)) {
				return {
					loc: {column: 0, line: 1},
					messageId: MESSAGE_ID_EXTENSION,
					data: {filename: filename + middle + extension.toLowerCase(), extension},
				};
			}

			return;
		}

		const renamedFilenames = fixName(words, chosenCasesFunctions, {
			leading,
			trailing: middle + extension.toLowerCase(),
		});

		return {
			// Report on first character like `unicode-bom` rule
			// https://github.com/eslint/eslint/blob/8a77b661bc921c3408bae01b3aa41579edfc6e58/lib/rules/unicode-bom.js#L46
			loc: {column: 0, line: 1},
			messageId: MESSAGE_ID,
			data: {
				chosenCases: getCaseNames(chosenCases),
				renamedFilenames: englishishJoinWords(renamedFilenames.map(x => `\`${x}\``)),
			},
		};
	});
};

const schema = [
	{
		description: 'The rule options.',
		anyOf: [
			{
				properties: {
					case: {
						enum: [
							'camelCase',
							'snakeCase',
							'kebabCase',
							'pascalCase',
						],
						description: 'The filename and directory name case style.',
					},
					ignore: {
						type: 'array',
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
				},
				additionalProperties: false,
			},
			{
				properties: {
					cases: {
						properties: {
							camelCase: {
								type: 'boolean',
								description: 'Whether to allow camelCase filenames and directory names.',
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
					ignore: {
						type: 'array',
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
				},
				additionalProperties: false,
			},
		],
	},
];

/** @type {import('eslint').Rule.RuleModule} */
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
	},
};

export default config;
