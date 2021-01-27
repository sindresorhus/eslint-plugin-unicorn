'use strict';

const path = require('path');
const test = require('ava');
const avaRuleTester = require('eslint-ava-rule-tester');
const snapshotRuleTester = require('./snapshot-rule-tester');

const defaultParserOptions = require('./default-parser-options');

const filename = module.parent.id;
const ruleId = path.basename(filename, '.js');
const rule = require(`../../rules/${ruleId}`);

function runTest(tests) {
	const {testerOptions, invalid, valid} = tests;
	const tester = createTester(testerOptions);
	return tester.run(ruleId, rule, {invalid, valid});
}

function createTester(options) {
	const tester = avaRuleTester(test, {
		parserOptions: defaultParserOptions,
		...options
	});
	return tester;
}

runTest.typescript = tests => {
	const {testerOptions = {}} = tests;
	testerOptions.parserOptions = testerOptions.parserOptions || {};

	return runTest({
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
};

runTest.babel = tests => {
	const {testerOptions = {}} = tests;
	testerOptions.parserOptions = testerOptions.parserOptions || {};
	testerOptions.parserOptions.babelOptions = testerOptions.parserOptions.babelOptions || {};
	testerOptions.parserOptions.babelOptions.parserOpts = testerOptions.parserOptions.babelOptions.parserOpts || {};
	testerOptions.parserOptions.babelOptions.parserOpts.plugins = testerOptions.parserOptions.babelOptions.parserOpts.plugins || [];

	return runTest({
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
					...testerOptions.parserOptions.babelOptions,
					parserOpts: {
						...testerOptions.parserOptions.babelOptions.parserOpts,
						plugins: [
							'jsx',
							'classProperties',
							...testerOptions.parserOptions.babelOptions.parserOpts.plugins
						]
					}
				}
			}
		}
	});
};

runTest.babelLegacy = tests => runTest({
	...tests,
	testerOptions: {parser: require.resolve('babel-eslint')}
});

function runSnapshotTest(cases) {
	const tester = snapshotRuleTester(test, {
		parserOptions: defaultParserOptions
	});
	return tester.run(ruleId, rule, cases);
}

runTest.snapshot = runSnapshotTest;

module.exports = {
	defaultParserOptions,
	ruleId,
	rule,
	test: runTest
};
