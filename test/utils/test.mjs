import path from 'node:path';
import url from 'node:url';
import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {loadRule} from '../../rules/utils/rule.js';
import SnapshotRuleTester from './snapshot-rule-tester.mjs';
import defaultParserOptions from './default-parser-options.mjs';
import parsers from './parsers.mjs';

function normalizeTests(tests) {
	return tests.map(test => typeof test === 'string' ? {code: test} : test);
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

function normalizeParser(options) {
	const {
		parser,
		parserOptions,
	} = options;

	if (parser) {
		if (parser.name) {
			options.parser = parser.name;
		}

		if (parser.mergeParserOptions) {
			options.parserOptions = parser.mergeParserOptions(parserOptions);
		}
	}

	return options;
}

class Tester {
	constructor(ruleId) {
		this.ruleId = ruleId;
		this.rule = loadRule(ruleId);
	}

	runTest(tests) {
		const {beforeAll, testerOptions = {}, valid, invalid} = tests;
		const tester = avaRuleTester(test, {
			...testerOptions,
			parserOptions: {
				...defaultParserOptions,
				...testerOptions.parserOptions,
			},
		});

		if (beforeAll) {
			beforeAll(tester);
		}

		return tester.run(
			this.ruleId,
			this.rule,
			{
				valid,
				invalid: invalid.map(test => normalizeInvalidTest(test, this.rule)),
			},
		);
	}

	snapshot(tests) {
		let {
			testerOptions = {},
			valid,
			invalid,
		} = tests;

		testerOptions = normalizeParser(testerOptions);
		valid = normalizeTests(valid).map(test => normalizeParser(test));
		invalid = normalizeTests(invalid).map(test => normalizeParser(test));

		const tester = new SnapshotRuleTester(test, {
			...testerOptions,
			parserOptions: {
				...defaultParserOptions,
				...testerOptions.parserOptions,
			},
		});
		return tester.run(this.ruleId, this.rule, {valid, invalid});
	}
}

function getTester(importMeta) {
	const filename = url.fileURLToPath(importMeta.url);
	const ruleId = path.basename(filename, '.mjs');
	const tester = new Tester(ruleId);
	const runTest = Tester.prototype.runTest.bind(tester);
	runTest.snapshot = Tester.prototype.snapshot.bind(tester);

	for (const [parserName, parserSettings] of Object.entries(parsers)) {
		Reflect.defineProperty(runTest, parserName, {
			value(tests) {
				const testerOptions = tests.testerOptions || {};
				const {parser, mergeParserOptions} = parserSettings;

				return runTest({
					...tests,
					testerOptions: {
						...testerOptions,
						parser,
						parserOptions: mergeParserOptions(testerOptions.parserOptions),
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

const addComment = (test, comment) => {
	const {code, output} = test;
	const fixedTest = {
		...test,
		code: `${code}\n/* ${comment} */`,
	};
	if (Object.prototype.hasOwnProperty.call(fixedTest, 'output') && typeof output === 'string') {
		fixedTest.output = `${output}\n/* ${comment} */`;
	}

	return fixedTest;
};

const avoidTestTitleConflict = (tests, comment) => {
	const {valid, invalid} = tests;
	return {
		...tests,
		valid: normalizeTests(valid).map(test => addComment(test, comment)),
		invalid: normalizeTests(invalid).map(test => addComment(test, comment)),
	};
};

export {
	getTester,
	avoidTestTitleConflict,
};
export {default as parsers} from './parsers.mjs';
