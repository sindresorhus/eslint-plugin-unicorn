import path from 'node:path';
import url from 'node:url';
import test from 'ava';
import AvaRuleTester from 'eslint-ava-rule-tester';
import {loadRule} from '../../rules/utils/rule.js';
import SnapshotRuleTester from './snapshot-rule-tester.mjs';
import parsers from './parsers.mjs';
import {DEFAULT_LANGUAGE_OPTIONS, normalizeLanguageOptions, mergeLanguageOptions} from './language-options.mjs';

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
		// eslint-disable-next-line unicorn/no-null
		output: null,
		...test,
	};
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
		this.rule = loadRule(ruleId);
	}

	runTest(tests) {
		const {ruleId, rule} = this;

		let {testerOptions = {}, valid, invalid} = tests;

		valid = valid.map(testCase => normalizeTestCase(testCase));
		invalid = invalid.map(testCase => normalizeInvalidTest(normalizeTestCase(testCase), rule));

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
		let {testerOptions = {}, languageOptionsMerger = mergeLanguageOptions, valid, invalid} = tests;

		valid = valid.map(testCase => normalizeTestCase(testCase));
		invalid = invalid.map(testCase => normalizeTestCase(testCase));

		const testConfig = {
			...testerOptions,
			languageOptions: languageOptionsMerger(DEFAULT_LANGUAGE_OPTIONS, testerOptions.languageOptions),
		};

		const tester = new SnapshotRuleTester(test, testConfig);
		const {ruleId, rule} = this;
		return tester.run(ruleId, rule, {valid, invalid});
	}
}

function getTester(importMeta) {
	const filename = url.fileURLToPath(importMeta.url);
	const ruleId = path.basename(filename, '.mjs');
	const tester = new Tester(ruleId);

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
	getTester,
	avoidTestTitleConflict,
};
export {default as parsers} from './parsers.mjs';
