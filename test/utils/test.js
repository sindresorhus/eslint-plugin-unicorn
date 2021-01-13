'use strict';

const path = require('path');
const url = require('url');
const test = require('ava');
const avaRuleTester = require('eslint-ava-rule-tester');
const visualizeRuleTester = require('./visualize-rule-tester');

const defaultParserOptions = require('./default-parser-options');

class Tester {
	constructor(ruleId) {
		this.ruleId = ruleId;
		this.rule = require(`../../rules/${ruleId}`);
	}

	runTest(tests) {
		const {testerOptions, invalid, valid} = tests;
		const tester = avaRuleTester(test, {
			parserOptions: defaultParserOptions,
			...testerOptions
		});
		return tester.run(this.ruleId, this.rule, {invalid, valid});
	}

	typescript(tests) {
		return this.runTest({
			...tests,
			testerOptions: {parser: require.resolve('@typescript-eslint/parser')}
		});
	}

	babel(tests) {
		return this.runTest({
			...tests,
			testerOptions: {parser: require.resolve('babel-eslint')}
		});
	}

	visualize(tests) {
		const tester = visualizeRuleTester(test, {
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
	test.visualize = tester.visualize.bind(tester);

	return {
		ruleId,
		rule: tester.rule,
		test
	};
}

module.exports = {
	defaultParserOptions,
	getTester
};
