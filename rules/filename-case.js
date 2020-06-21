'use strict';
const path = require('path');
const {camelCase, kebabCase, snakeCase, upperFirst} = require('lodash');
const getDocumentationUrl = require('./utils/get-documentation-url');
const cartesianProductSamples = require('./utils/cartesian-product-samples');

const pascalCase = string => upperFirst(camelCase(string));
const numberRegex = /\d+/;
const PLACEHOLDER = '\uFFFF\uFFFF\uFFFF';
const PLACEHOLDER_REGEX = new RegExp(PLACEHOLDER, 'i');
const isIgnoredChar = char => !/^[a-z\d-_$]$/i.test(char);

function ignoreNumbers(fn) {
	return string => {
		const stack = [];
		let execResult = numberRegex.exec(string);

		while (execResult) {
			stack.push(execResult[0]);
			string = string.replace(execResult[0], PLACEHOLDER);
			execResult = numberRegex.exec(string);
		}

		let withCase = fn(string);

		while (stack.length > 0) {
			withCase = withCase.replace(PLACEHOLDER_REGEX, stack.shift());
		}

		return withCase;
	};
}

const cases = {
	camelCase: {
		fn: camelCase,
		name: 'camel case'
	},
	kebabCase: {
		fn: kebabCase,
		name: 'kebab case'
	},
	snakeCase: {
		fn: snakeCase,
		name: 'snake case'
	},
	pascalCase: {
		fn: pascalCase,
		name: 'pascal case'
	}
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

function validateFilename(words, caseFunctions) {
	return words
		.filter(({ignored}) => !ignored)
		.every(({word}) => caseFunctions.some(fn => fn(word) === word));
}

function fixFilename(words, caseFunctions, {leading, extension}) {
	const replacements = words
		.map(({word, ignored}) => ignored ? [word] : caseFunctions.map(fn => fn(word)));

	const {
		samples: combinations
	} = cartesianProductSamples(replacements);

	return combinations.map(parts => `${leading}${parts.join('')}${extension}`);
}

const leadingUnderscoresRegex = /^(?<leading>_+)(?<tailing>.*)$/;
function splitFilename(filename) {
	const result = leadingUnderscoresRegex.exec(filename) || {groups: {}};
	const {leading = '', tailing = filename} = result.groups;

	const words = [];

	let lastWord;
	for (const char of tailing) {
		const isIgnored = isIgnoredChar(char);

		if (lastWord && lastWord.ignored === isIgnored) {
			lastWord.word += char;
		} else {
			lastWord = {
				word: char,
				ignored: isIgnored
			};
			words.push(lastWord);
		}
	}

	return {
		leading,
		words
	};
}

/**
Turns `[a, b, c]` into `a, b, or c`.

@param {string[]} words
@returns {string}
*/
function englishishJoinWords(words) {
	if (words.length === 1) {
		return words[0];
	}

	if (words.length === 2) {
		return `${words[0]} or ${words[1]}`;
	}

	words = words.slice();
	const last = words.pop();
	return `${words.join(', ')}, or ${last}`;
}

const create = context => {
	const options = context.options[0] || {};
	const chosenCases = getChosenCases(options);
	const ignore = (options.ignore || []).map(item => {
		if (item instanceof RegExp) {
			return item;
		}

		return new RegExp(item, 'u');
	});
	const chosenCasesFunctions = chosenCases.map(case_ => ignoreNumbers(cases[case_].fn));
	const filenameWithExtension = context.getFilename();

	if (filenameWithExtension === '<input>' || filenameWithExtension === '<text>') {
		return {};
	}

	return {
		Program: node => {
			const extension = path.extname(filenameWithExtension);
			const filename = path.basename(filenameWithExtension, extension);
			const base = filename + extension;

			if (base === 'index.js' || ignore.some(regexp => regexp.test(base))) {
				return;
			}

			const {leading, words} = splitFilename(filename);
			const isValid = validateFilename(words, chosenCasesFunctions);

			if (isValid) {
				return;
			}

			const renamedFilenames = fixFilename(words, chosenCasesFunctions, {
				leading,
				extension
			});

			context.report({
				node,
				messageId: chosenCases.length > 1 ? 'renameToCases' : 'renameToCase',
				data: {
					chosenCases: englishishJoinWords(chosenCases.map(x => cases[x].name)),
					renamedFilenames: englishishJoinWords(renamedFilenames.map(x => `\`${x}\``))
				}
			});
		}
	};
};

const schema = [
	{
		oneOf: [
			{
				properties: {
					case: {
						enum: [
							'camelCase',
							'snakeCase',
							'kebabCase',
							'pascalCase'
						]
					},
					ignore: {
						type: 'array',
						uniqueItems: true
					}
				},
				additionalProperties: false
			},
			{
				properties: {
					cases: {
						properties: {
							camelCase: {
								type: 'boolean'
							},
							snakeCase: {
								type: 'boolean'
							},
							kebabCase: {
								type: 'boolean'
							},
							pascalCase: {
								type: 'boolean'
							}
						},
						additionalProperties: false
					},
					ignore: {
						type: 'array',
						uniqueItems: true
					}
				},
				additionalProperties: false
			}
		]
	}
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		schema,
		messages: {
			renameToCase: 'Filename is not in {{chosenCases}}. Rename it to {{renamedFilenames}}.',
			renameToCases: 'Filename is not in {{chosenCases}}. Rename it to {{renamedFilenames}}.'
		}
	}
};
