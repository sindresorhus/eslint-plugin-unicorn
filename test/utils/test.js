import path from 'node:path';
import url from 'node:url';
import test from 'ava';
import AvaRuleTester from 'eslint-ava-rule-tester';
import {Linter} from 'eslint';
import plugin from '../../index.js';
import SnapshotRuleTester from './snapshot-rule-tester.js';
import parsers from './parsers.js';
import {DEFAULT_LANGUAGE_OPTIONS, normalizeLanguageOptions, mergeLanguageOptions} from './language-options.js';

const RULES_REPORTING_EMPTY_FILE = new Set([
	'no-empty-file',
]);

function normalizeTestCase(testCase, shouldNormalizeLanguageOptions = true) {
	if (typeof testCase === 'string') {
		testCase = {code: testCase};
	}

	if (shouldNormalizeLanguageOptions && testCase.languageOptions) {
		testCase = {...testCase, languageOptions: normalizeLanguageOptions(testCase.languageOptions)};
	}

	return testCase;
}

function normalizeInvalidTest(test, rule) {
	const {code, output, errors} = test;

	if (code === output) {
		console.log(JSON.stringify(test, undefined, 2));
		throw new Error('Remove output if your test do not fix code.');
	}

	if (Array.isArray(errors) && errors.some(error => error.suggestions) && rule.meta.hasSuggestions !== true) {
		// This check will no longer be necessary if this change lands in ESLint 8: https://github.com/eslint/eslint/issues/14312
		throw new Error('Rule with suggestion is missing `meta.hasSuggestions`.');
	}

	return {
		// Use `null` instead of `code` to get a better message
		// See https://github.com/eslint/eslint/blob/8a77b661bc921c3408bae01b3aa41579edfc6e58/lib/rule-tester/rule-tester.js#L847-L853

		output: JSON.parse('null'),
		...test,
	};
}

function assertNoManualEmptyFileTestCases(ruleId, testCases) {
	if (RULES_REPORTING_EMPTY_FILE.has(ruleId)) {
		return;
	}

	if (testCases.some(({code}) => code === '')) {
		throw new Error(`Do not add manual empty file test cases for \`${ruleId}\`. They are covered by the shared empty file test.`);
	}
}

// https://github.com/tc39/proposal-array-is-template-object
const isTemplateObject = value => Array.isArray(value?.raw);
// https://github.com/tc39/proposal-string-cooked
const cooked = (raw, ...substitutions) => String.raw({raw}, ...substitutions);

function only(...arguments_) {
	/*
	```js
	only`code`;
	```
 	*/
	if (isTemplateObject(arguments_[0])) {
		return {code: cooked(...arguments_), only: true};
	}

	/*
	```js
	only('code');
	only({code: 'code'});
	*/
	return {...normalizeTestCase(arguments_[0], /* shouldNormalizeLanguageOptions */ false), only: true};
}

class Tester {
	constructor(ruleId) {
		this.ruleId = ruleId;
		this.rule = plugin.rules[ruleId];
	}

	runEmptyFileTest() {
		const {ruleId, rule} = this;

		// Empty input should be a no-op for every rule except the rule that exists to report it.
		if (RULES_REPORTING_EMPTY_FILE.has(ruleId)) {
			return;
		}

		Reflect.apply(test, undefined, [`empty file: ${ruleId}`, t => {
			const linter = new Linter();
			const messages = linter.verify(
				'',
				// Avoid a separate `{files}` config-array entry here. It makes ESLint merge an extra config for every empty-file smoke test.
				{
					files: ['**'],
					languageOptions: DEFAULT_LANGUAGE_OPTIONS,
					linterOptions: {
						reportUnusedDisableDirectives: 'off',
					},
					plugins: {
						'rule-to-test': {
							rules: {
								[ruleId]: rule,
							},
						},
					},
					rules: {
						[`rule-to-test/${ruleId}`]: 'error',
					},
				},
				{filename: 'index.js'},
			);

			t.deepEqual(messages, []);
		}]);
	}

	runTest(tests) {
		const {ruleId, rule} = this;

		let {testerOptions = {}, valid, invalid} = tests;

		valid = valid.map(testCase => normalizeTestCase(testCase));
		invalid = invalid.map(testCase => normalizeInvalidTest(normalizeTestCase(testCase), rule));
		assertNoManualEmptyFileTestCases(ruleId, [...valid, ...invalid]);

		const testConfig = {
			...testerOptions,
			languageOptions: mergeLanguageOptions(DEFAULT_LANGUAGE_OPTIONS, testerOptions.languageOptions),
		};

		const tester = new AvaRuleTester(test, testConfig);

		return tester.run(
			ruleId,
			rule,
			{valid, invalid},
		);
	}

	snapshot(tests) {
		const {ruleId, rule} = this;
		let {testerOptions = {}, valid, invalid} = tests;

		valid = valid.map(testCase => normalizeTestCase(testCase));
		invalid = invalid.map(testCase => normalizeTestCase(testCase));
		assertNoManualEmptyFileTestCases(ruleId, [...valid, ...invalid]);

		const testConfig = {
			...testerOptions,
			languageOptions: mergeLanguageOptions(DEFAULT_LANGUAGE_OPTIONS, testerOptions.languageOptions),
		};

		const tester = new SnapshotRuleTester(test, testConfig);
		return tester.run(ruleId, rule, {valid, invalid});
	}
}

function getTester(importMeta) {
	const filename = url.fileURLToPath(importMeta.url);
	const ruleId = path.basename(filename, '.js');
	const tester = new Tester(ruleId);
	tester.runEmptyFileTest();

	const runTest = Tester.prototype.runTest.bind(tester);
	runTest.snapshot = Tester.prototype.snapshot.bind(tester);
	runTest.only = only;

	for (const parser of Object.values(parsers)) {
		Reflect.defineProperty(runTest, parser.name, {
			value(tests) {
				return runTest({
					...tests,
					testerOptions: {
						...tests.testerOptions,
						languageOptions: {
							...tests.testerOptions?.languageOptions,
							parser,
						},
					},
				});
			},
		});
	}

	return {
		ruleId,
		rule: tester.rule,
		test: runTest,
	};
}

const addComment = (testCase, comment) => {
	testCase = normalizeTestCase(testCase, /* shouldNormalizeLanguageOptions */ false);
	const {code, output} = testCase;
	const fixedTest = {
		...testCase,
		code: `${code}\n/* ${comment} */`,
	};
	if (Object.hasOwn(fixedTest, 'output') && typeof output === 'string') {
		fixedTest.output = `${output}\n/* ${comment} */`;
	}

	return fixedTest;
};

const avoidTestTitleConflict = (tests, comment) => {
	const {valid, invalid} = tests;
	return {
		...tests,
		valid: valid.map(testCase => addComment(testCase, comment)),
		invalid: invalid.map(testCase => addComment(testCase, comment)),
	};
};

export {
	normalizeTestCase,
	getTester,
	avoidTestTitleConflict,
};
export {default as parsers} from './parsers.js';
export {default as languages} from './languages.js';
