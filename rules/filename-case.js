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
const reservedBasenames = new Set([
	'index.js',
	'index.mjs',
	'index.cjs',
	'index.ts',
	'index.tsx',
	'index.vue',
	'AGENTS.md',
	'AGENTS.override.md',
	'CLAUDE.md',
	'CLAUDE.local.md',
	'GEMINI.md',
	'SKILL.md',
	'Cargo.lock',
	'Cargo.toml',
	'Chart.lock',
	'Chart.yaml',
	'CMakePresets.json',
	'CMakeUserPresets.json',
	'Project.toml',
	'JuliaProject.toml',
	'Manifest.toml',
	'JuliaManifest.toml',
]);
const versionedJuliaManifestRegex = /^(?:Julia)?Manifest-v\d+\.\d+\.toml$/u;
const githubCommunityDirectories = ['.', 'docs', '.github'];
const azureMetadataDirectories = ['.azuredevops', '.vsts'];
const azurePullRequestTemplateParents = ['.', 'docs', ...azureMetadataDirectories];
const pullRequestTemplateBasenames = ['pull_request_template.md', 'pull_request_template.txt'];
const gitlabTemplateDirectories = ['.gitlab/issue_templates', '.gitlab/merge_request_templates'];
const giteaAndForgejoTemplateDirectories = [...githubCommunityDirectories, '.gitea', '.forgejo'];
const issueTemplateNames = ['ISSUE_TEMPLATE', 'issue_template'];
const mergeMessageDirectories = ['.gitea/default_merge_message', '.forgejo/default_merge_message'];
const reservedFilePaths = new Set([
	...getPathsInDirectories(githubCommunityDirectories, ['ACCESSIBILITY.md', 'CODEOWNERS', 'SUPPORT.md']),
	...getPathsInDirectories(giteaAndForgejoTemplateDirectories, [
		...issueTemplateNames,
		'PULL_REQUEST_TEMPLATE',
		'pull_request_template',
	].flatMap(stem => ['md', 'yml', 'yaml'].map(extension => `${stem}.${extension}`))),
	...getPathsInDirectories(mergeMessageDirectories, [
		'MERGE_TEMPLATE.md',
		'REBASE_TEMPLATE.md',
		'REBASE-MERGE_TEMPLATE.md',
		'SQUASH_TEMPLATE.md',
		'MANUALLY-MERGED_TEMPLATE.md',
		'REBASE-UPDATE-ONLY_TEMPLATE.md',
	]),
	'.bitbucket/CODEOWNERS',
	'.bitbucket/pull_request_template.md',
	'.forgejo/CODEOWNERS',
	'.gitea/CODEOWNERS',
	'.github/FUNDING.yml',
	'.github/VULNERABILITY_REPORT.yml',
	'.github/VULNERABILITY_REPORT.yaml',
	'.gitlab/CODEOWNERS',
	'CITATION.cff',
]);
const reservedFilePathsWithCaseInsensitiveBasename = new Set([
	...getPathsInDirectories(['.github'], pullRequestTemplateBasenames),
	...getPathsInDirectories(gitlabTemplateDirectories, ['default.md']),
]);
const caseInsensitiveReservedFilePaths = new Set(getPathsInDirectories(azurePullRequestTemplateParents, pullRequestTemplateBasenames));
const reservedDirectoryPaths = new Set([
	'.bitbucket',
	'.forgejo',
	'.gitea',
	'.github',
	'.gitlab',
	...getPathsInDirectories(githubCommunityDirectories, ['PULL_REQUEST_TEMPLATE']),
	...getPathsInDirectories([...giteaAndForgejoTemplateDirectories, '.gitlab'], issueTemplateNames),
	...mergeMessageDirectories,
	'.github/DISCUSSION_TEMPLATE',
	...gitlabTemplateDirectories,
]);
const caseInsensitiveReservedDirectoryPaths = new Set([
	...azureMetadataDirectories,
	...getPathsInDirectories(azurePullRequestTemplateParents, ['pull_request_template', 'pull_request_template/branches']),
]);
const alphanumericRegex = /^[\da-z]+$/i;
const leadingAcronymRegex = /^[A-Z]{3,}(?=\d*[A-Z](?:[a-z]|\d+[a-z]))/;

const isAsciiDigit = char => char >= '0' && char <= '9';
const isAsciiLowercaseLetter = char => char >= 'a' && char <= 'z';
const isAsciiUppercaseLetter = char => char >= 'A' && char <= 'Z';

function getPathsInDirectories(directories, names) {
	return directories.flatMap(directory => names.map(name => path.posix.join(directory, name)));
}

function isReservedFilename(basename, directoryPath) {
	if (reservedBasenames.has(basename) || versionedJuliaManifestRegex.test(basename)) {
		return true;
	}

	if (directoryPath === undefined) {
		return false;
	}

	const filePath = path.posix.join(directoryPath, basename);
	return reservedFilePaths.has(filePath)
		|| reservedFilePathsWithCaseInsensitiveBasename.has(path.posix.join(directoryPath, basename.toLowerCase()))
		|| caseInsensitiveReservedFilePaths.has(filePath.toLowerCase());
}

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

function getDirectoriesToCheck(directorySegments, directoryRoots) {
	const directories = [];
	let directoryPath = '';

	for (const directory of directorySegments) {
		directoryPath = directoryPath ? `${directoryPath}/${directory}` : directory;

		if (isDirectoryRoot(directoryPath, directoryRoots)) {
			directories.length = 0;
		} else if (!reservedDirectoryPaths.has(directoryPath) && !caseInsensitiveReservedDirectoryPaths.has(directoryPath.toLowerCase())) {
			directories.push(directory);
		}
	}

	return directories;
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
const formatDisjunction = words => {
	// Created per call instead of when the plugin is loaded, since creating it loads locale data, and it is only needed for reports.
	const listFormat = new Intl.ListFormat('en-US', {type: 'disjunction'});
	return listFormat.format(words);
};

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
		const relativePath = path.relative(context.cwd, path.resolve(context.cwd, physicalFilename));
		const isInsideWorkingDirectory = isInsideCwd(relativePath);
		const pathSegments = isInsideWorkingDirectory ? relativePath.split(path.sep) : [path.basename(physicalFilename)];

		if (pathSegments.some(segment => ignoreRegexps.some(regexp => regexp.test(segment)))) {
			return;
		}

		const directorySegments = pathSegments.slice(0, -1);
		if (isCheckDirectories) {
			for (const directory of getDirectoriesToCheck(directorySegments, directoryRoots)) {
				const report = getInvalidDirectoryReport(directory, chosenCases, chosenCaseFunctions);

				if (report) {
					return report;
				}
			}
		}

		const {
			filename,
			additionalExtensions,
			extension,
		} = getFilenameParts(pathSegments.at(-1), {multipleFileExtensions: isMultipleFileExtensions});
		const lowercaseExtension = extension.toLowerCase();
		const filenameWithLowercaseExtension = filename + additionalExtensions + lowercaseExtension;
		const directoryPath = isInsideWorkingDirectory ? directorySegments.join('/') : undefined;
		const {leading, words} = splitName(filename);
		const isValid = isReservedFilename(filenameWithLowercaseExtension, directoryPath)
			|| filename.startsWith('$')
			|| isValidName(words, chosenCaseFunctions);

		if (isValid) {
			if (extension !== lowercaseExtension) {
				return {
					loc: {column: 0, line: 1},
					messageId: MESSAGE_ID_EXTENSION,
					data: {filename: filenameWithLowercaseExtension, extension},
				};
			}

			return;
		}

		const renamedFilenames = getRenamedNames(words, chosenCaseFunctions, {
			leading,
			trailing: additionalExtensions + lowercaseExtension,
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
