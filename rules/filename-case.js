'use strict';
const path = require('path');
const camelCase = require('lodash.camelcase');
const kebabCase = require('lodash.kebabcase');
const snakeCase = require('lodash.snakecase');
const upperfirst = require('lodash.upperfirst');
const getDocsUrl = require('./utils/get-docs-url');
const cartesianProductSamples = require('./utils/cartesian-product-samples');

const pascalCase = string => upperfirst(camelCase(string));
const numberRegex = /(\d+)/;
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

@param {unknown} context
@returns {string[]} The chosen cases.
*/
function getChosenCases(context) {
	const option = context.options[0] || {};

	if (option.case) {
		return [option.case];
	}

	if (option.cases) {
		const cases = Object.keys(option.cases)
			.filter(cases => option.cases[cases]);

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

const leadingUnserscoresRegex = /^(_+)(.*)$/;
function splitFilename(filename) {
	const res = leadingUnserscoresRegex.exec(filename);

	const leading = (res && res[1]) || '';
	const tailing = (res && res[2]) || filename;

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
	const chosenCases = getChosenCases(context);
	const chosenCasesFunctions = chosenCases.map(case_ => ignoreNumbers(cases[case_].fn));
	const filenameWithExtension = context.getFilename();

	if (filenameWithExtension === '<input>' || filenameWithExtension === '<text>') {
		return {};
	}

	return {
		Program: node => {
			const extension = path.extname(filenameWithExtension);
			const filename = path.basename(filenameWithExtension, extension);

			if (filename + extension === 'index.js') {
				return;
			}

			const {
				leading,
				words
			} = splitFilename(filename);
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

const schema = [{
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
				}
			},
			additionalProperties: false
		}
	]
}];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		schema,
		messages: {
			renameToCase: 'Filename is not in {{chosenCases}}. Rename it to {{renamedFilenames}}.',
			renameToCases: 'Filename is not in {{chosenCases}}. Rename it to {{renamedFilenames}}.'
		}
	}
};
