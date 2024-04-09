import path from 'node:path';
import {Linter} from 'eslint';
import {codeFrameColumns} from '@babel/code-frame';
import outdent from 'outdent';
import {mergeLanguageOptions} from './language-options.mjs';

const codeFrameColumnsOptions = {linesAbove: Number.POSITIVE_INFINITY, linesBelow: Number.POSITIVE_INFINITY};
// A simple version of `SourceCodeFixer.applyFixes`
// https://github.com/eslint/eslint/issues/14936#issuecomment-906746754
const applyFix = (code, {fix}) => `${code.slice(0, fix.range[0])}${fix.text}${code.slice(fix.range[1])}`;

function visualizeRange(text, location, message) {
	return codeFrameColumns(
		text,
		location,
		{
			...codeFrameColumnsOptions,
			message,
		},
	);
}

function visualizeEslintMessage(text, result) {
	const {line, column, endLine, endColumn, message} = result;
	const location = {
		start: {
			line,
			column,
		},
	};

	if (typeof endLine === 'number' && typeof endColumn === 'number') {
		location.end = {
			line: endLine,
			column: endColumn,
		};
	}

	return visualizeRange(text, location, message);
}

const printCode = code => codeFrameColumns(code, {start: {line: 0, column: 0}}, codeFrameColumnsOptions);
const getAdditionalProperties = (object, properties) =>
	Object.keys(object).filter(property => !properties.includes(property));

function normalizeTests(tests) {
	const additionalProperties = getAdditionalProperties(tests, ['valid', 'invalid']);
	if (additionalProperties.length > 0) {
		throw new Error(`Unexpected snapshot test properties: ${additionalProperties.join(', ')}`);
	}

	for (const type of ['valid', 'invalid']) {
		const cases = tests[type];

		for (const [index, testCase] of cases.entries()) {
			if (typeof testCase === 'string') {
				cases[index] = {code: testCase};
				continue;
			}

			const additionalProperties = getAdditionalProperties(
				testCase,
				['code', 'options', 'filename', 'languageOptions', 'only'],
			);

			if (additionalProperties.length > 0) {
				throw new Error(`Unexpected ${type} snapshot test case properties: ${additionalProperties.join(', ')}`);
			}
		}
	}

	return tests;
}

function getVerifyConfig(ruleId, rule, testerConfig, testCase) {
	const {
		languageOptions = {},
		options = [],
	} = testCase;

	// https://github.com/eslint/eslint/blob/ee7f9e62102d3dd0b7581d1e88e41bce3385980a/lib/rule-tester/rule-tester.js#L501
	const pluginName = 'rule-to-test';

	return [
		// https://github.com/eslint/eslint/blob/ee7f9e62102d3dd0b7581d1e88e41bce3385980a/lib/rule-tester/rule-tester.js#L524
		{files: ['**']},
		{
			...testerConfig,
			languageOptions: mergeLanguageOptions(testerConfig.languageOptions, languageOptions),
			rules: {
				[`${pluginName}/${ruleId}`]: ['error', ...options],
			},
			plugins: {
				[pluginName]: {
					rules: {
						[ruleId]: rule,
					},
				},
			},
			// https://github.com/eslint/eslint/blob/ee7f9e62102d3dd0b7581d1e88e41bce3385980a/lib/config/default-config.js#L46-L48
			linterOptions: {
				reportUnusedDisableDirectives: 'off',
			},
		},
	];
}

function verify(code, verifyConfig, {filename}) {
	// https://github.com/eslint/eslint/pull/17989
	const linterOptions = {};
	if (filename) {
		linterOptions.cwd = path.parse(filename).root;
	}

	const linter = new Linter(linterOptions);
	const messages = linter.verify(code, verifyConfig, {filename});

	// Missed `message`, #1923
	const invalidMessage = messages.find(({message}) => typeof message !== 'string');
	if (invalidMessage) {
		throw Object.assign(new Error('Unexpected message.'), {eslintMessage: invalidMessage});
	}

	const fatalError = messages.find(({fatal}) => fatal);
	if (fatalError) {
		const {line, column, message} = fatalError;
		throw new SyntaxError('\n' + codeFrameColumns(code, {start: {line, column}}, {message}));
	}

	return {
		linter,
		messages,
	};
}

class SnapshotRuleTester {
	constructor(test, testerConfig) {
		this.test = test;
		this.testerConfig = testerConfig;
	}

	run(ruleId, rule, tests) {
		const {test, testerConfig} = this;
		const fixable = rule.meta && rule.meta.fixable;

		const {valid, invalid} = normalizeTests(tests);

		for (const [index, testCase] of valid.entries()) {
			const {code, filename, only} = testCase;
			const verifyConfig = getVerifyConfig(ruleId, rule, testerConfig, testCase);

			(only ? test.only : test)(
				`valid(${index + 1}): ${code}`,
				t => {
					const {messages} = verify(code, verifyConfig, {filename});
					t.deepEqual(messages, [], 'Valid case should not have errors.');
				},
			);
		}

		for (const [index, testCase] of invalid.entries()) {
			const {code, options, filename, only} = testCase;
			const verifyConfig = getVerifyConfig(ruleId, rule, testerConfig, testCase);
			const runVerify = code => verify(code, verifyConfig, {filename});

			(only ? test.only : test)(
				`invalid(${index + 1}): ${code}`,
				t => {
					const {linter, messages} = runVerify(code);

					t.notDeepEqual(messages, [], 'Invalid case should have at least one error.');
					const {fixed, output} = fixable ? linter.verifyAndFix(code, verifyConfig, {filename}) : {fixed: false};

					t.snapshot(`\n${printCode(code)}\n`, 'Input');

					if (filename) {
						t.snapshot(`\n${filename}\n`, 'Filename');
					}

					if (Array.isArray(options)) {
						t.snapshot(`\n${JSON.stringify(options, undefined, 2)}\n`, 'Options');
					}

					if (fixable && fixed) {
						runVerify(output);
						t.snapshot(`\n${printCode(output)}\n`, 'Output');
					}

					for (const [index, message] of messages.entries()) {
						let messageForSnapshot = visualizeEslintMessage(code, message);

						const {suggestions = []} = message;

						for (const [index, suggestion] of suggestions.entries()) {
							const output = applyFix(code, suggestion);
							runVerify(output);

							messageForSnapshot += outdent`
								\n
								${'-'.repeat(80)}
								Suggestion ${index + 1}/${suggestions.length}: ${suggestion.desc}
								${printCode(output)}
							`;
						}

						t.snapshot(`\n${messageForSnapshot}\n`, `Error ${index + 1}/${messages.length}`);
					}
				},
			);
		}
	}
}

export default SnapshotRuleTester;
