import path from 'node:path';
import url from 'node:url';
import {createRequire} from 'node:module';
import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import snapshotRuleTester from './snapshot-rule-tester.mjs';
import defaultParserOptions from './default-parser-options.mjs';

const require = createRequire(import.meta.url);

function normalizeInvalidTest(test) {
	const {code, output} = test;

	if (code === output) {
		console.log(JSON.stringify(test, undefined, 2));
		throw new Error('Remove output if your test do not fix code.');
	}

	return {
		// Use `null` instead of `code` to get a better message
		// See https://github.com/eslint/eslint/blob/8a77b661bc921c3408bae01b3aa41579edfc6e58/lib/rule-tester/rule-tester.js#L847-L853
		// eslint-disable-next-line unicorn/no-null
		output: null,
		...test
	};
}

class Tester {
	constructor(ruleId) {
		this.ruleId = ruleId;
		this.rule = require(`../../rules/${ruleId}`);
	}

	runTest(tests) {
		const {testerOptions, valid, invalid} = tests;
		const tester = avaRuleTester(test, {
			parserOptions: defaultParserOptions,
			...testerOptions
		});
		return tester.run(
			this.ruleId,
			this.rule,
			{
				valid,
				invalid: invalid.map(test => normalizeInvalidTest(test))
			}
		);
	}

	typescript(tests) {
		const {testerOptions = {}} = tests;
		testerOptions.parserOptions = testerOptions.parserOptions || {};

		return this.runTest({
			...tests,
			testerOptions: {
				...testerOptions,
				parser: require.resolve('@typescript-eslint/parser'),
				parserOptions: {
					...defaultParserOptions,
					...testerOptions.parserOptions
				}
			}
		});
	}

	babel(tests) {
		const {testerOptions = {}} = tests;
		testerOptions.parserOptions = testerOptions.parserOptions || {};
		testerOptions.parserOptions.babelOptions = testerOptions.parserOptions.babelOptions || {};
		testerOptions.parserOptions.babelOptions.parserOpts = testerOptions.parserOptions.babelOptions.parserOpts || {};
		let babelPlugins = testerOptions.parserOptions.babelOptions.parserOpts.plugins || [];
		babelPlugins = [
			['estree', {classFeatures: true}],
			'jsx',
			'exportDefaultFrom',
			...babelPlugins
		];

		return this.runTest({
			...tests,
			testerOptions: {
				...testerOptions,
				parser: require.resolve('@babel/eslint-parser'),
				parserOptions: {
					...defaultParserOptions,
					requireConfigFile: false,
					sourceType: 'module',
					allowImportExportEverywhere: true,
					...testerOptions.parserOptions,
					babelOptions: {
						babelrc: false,
						configFile: false,
						...testerOptions.parserOptions.babelOptions,
						parserOpts: {
							allowAwaitOutsideFunction: true,
							...testerOptions.parserOptions.babelOptions.parserOpts,
							plugins: babelPlugins
						}
					}
				}
			}
		});
	}

	snapshot(tests) {
		const tester = snapshotRuleTester(test, {
			parserOptions: defaultParserOptions
		});
		return tester.run(this.ruleId, this.rule, tests);
	}
}

function getTester(importMeta) {
	const filename = url.fileURLToPath(importMeta.url);
	const ruleId = path.basename(filename, '.mjs');
	const tester = new Tester(ruleId);
	const test = tester.runTest.bind(tester);
	test.typescript = tester.typescript.bind(tester);
	test.babel = tester.babel.bind(tester);
	test.snapshot = tester.snapshot.bind(tester);

	return {
		ruleId,
		rule: tester.rule,
		test
	};
}

const addComment = (test, comment) => {
	if (typeof test === 'string') {
		return `${test}\n/* ${comment} */`;
	}

	const {code, output} = test;
	const fixedTest = {
		...test,
		code: `${code}\n/* ${comment} */`
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
		valid: valid.map(test => addComment(test, comment)),
		invalid: invalid.map(test => addComment(test, comment))
	};
};

export {
	defaultParserOptions,
	getTester,
	avoidTestTitleConflict
};
