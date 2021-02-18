'use strict';

const path = require('path');
const url = require('url');
const test = require('ava');
const avaRuleTester = require('eslint-ava-rule-tester');
const snapshotRuleTester = require('./snapshot-rule-tester');

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
		testerOptions.parserOptions.babelOptions.parserOpts.plugins = testerOptions.parserOptions.babelOptions.parserOpts.plugins || [];

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
	}

	snapshot(tests) {
		const tester = snapshotRuleTester(test, {
			parserOptions: defaultParserOptions
		});
		return tester.run(this.ruleId, this.rule, tests);
	}

	babelLegacy(tests) {
		return this.runTest({
			...tests,
			testerOptions: {parser: require.resolve('babel-eslint')}
		});
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
	test.babelLegacy = tester.babelLegacy.bind(tester);

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
