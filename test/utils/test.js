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

runTest.typescript = tests => runTest({
	...tests,
	testerOptions: {parser: require.resolve('@typescript-eslint/parser')}
});

runTest.babel = tests => runTest({
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
