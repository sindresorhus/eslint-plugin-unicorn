import test from 'ava';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test: ruleTest, rule} = getTester(import.meta);
const error = {messageId: 'single-line-block-comment-style'};

ruleTest.snapshot({
	valid: [
		outdent`
			/**
			Get the value.
			*/
		`,
		outdent`
			/*
			Get the value.
			*/
		`,
		outdent`
			/**
			First line.
			Second line.
			*/
		`,
		'const value = /* Get the value. */ 1;',
		'/* eslint-disable no-console */',
		'/* eslint-enable no-console */',
		'/* global value */',
		'/* prettier-ignore */',
		'/* @ts-ignore */',
		'/* @ts-ignore: explanation */',
		'/* @ts-expect-error: explanation */',
		'/* @jsxImportSource preact */',
		'/* @flow strict */',
		'/* @jest-environment node */',
		'/* c8 ignore next */',
		'/* istanbul ignore next */',
		'/* nyc ignore next */',
		'/* v8 ignore next */',
		'/* biome-ignore lint/suspicious/noExplicitAny */',
		'/* deno-lint-ignore no-explicit-any */',
		'/* dprint-ignore */',
		'/* oxlint-disable no-console */',
		'/* oxlint-enable no-console */',
		'/* cspell:ignore foo */',
		'/* spell-checker:ignore foo */',
		'/**/',
		'/* */',
		'/*\n*\n*/',
		'/**\n *\n */',
		'/*\n*\nValue.\n*/',
		'/** @jsxFrag Fragment */',
		outdent`
			/**
			 * @ts-ignore
			 */
		`,
		'\u2028/**\u2028Value.\u2028*/\u2028',
		'// Get the value.',
		'/*! License. */',
		'/*@__PURE__*/\nfoo();',
		'/*#__NO_SIDE_EFFECTS__*/\nfunction foo() {}',
		{
			code: '/** Another value. */',
			options: ['single-line'],
		},
		{
			code: '/* Another value. */',
			options: ['single-line'],
		},
		{
			code: '/**\r\nGet the value.\r\n*/',
		},
		'/* Get the value. */ const value = 1;',
		'const value = 1; /* Get the value. */',
	],
	invalid: [
		'/** Get the value. */',
		'/* Get the value. */',
		'\t/** Get the value. */',
		'/** Carriage return value. */\r\nconst value = 1;',
		'/*** Value */',
		'/** Value.\n*/',
		'/* Value.\n*/',
		'\u2028/** Value. */\u2028const value = 1;',
		{
			code: outdent`
				/**
				Another value.
				*/
			`,
			options: ['single-line'],
		},
		{
			code: outdent`
				/*
				Another value.
				*/
			`,
			options: ['single-line'],
		},
		{
			code: '/**\r\nCarriage return value.\r\n*/',
			options: ['single-line'],
		},
		{
			code: '\t/**\r\nCarriage return value.\r\n\t*/',
			options: ['single-line'],
		},
		{
			code: '/**\nValue. */',
			options: ['single-line'],
		},
		{
			code: '/*\nValue. */',
			options: ['single-line'],
		},
	],
});

const getConfig = options => ({
	languageOptions: {
		ecmaVersion: 'latest',
	},
	plugins: {
		rule: {
			rules: {
				'single-line-block-comment-style': rule,
			},
		},
	},
	rules: {
		'rule/single-line-block-comment-style': ['error', ...options],
	},
});

ruleTest({
	valid: [
		{
			code: outdent`
				/**
				First line.
				Second line.
				*/
			`,
			options: ['single-line'],
		},
		{
			code: 'const value = /* Get the value. */ 1;',
			options: ['single-line'],
		},
		{
			code: '/* eslint-disable no-console */',
			options: ['single-line'],
		},
		{
			code: '/* eslint-enable no-console */',
			options: ['single-line'],
		},
		{
			code: '/* */',
			options: ['single-line'],
		},
		{
			code: '/*! License. */',
			options: ['single-line'],
		},
		{
			code: '/*!\r\nLicense.\r\n*/',
			options: ['single-line'],
		},
		{
			code: '/**/',
			options: ['single-line'],
		},
		{
			code: '/**\n *\n */',
			options: ['single-line'],
		},
		{
			code: '/*\nFirst line.\nSecond line.\n*/',
			options: ['single-line'],
		},
		{
			code: '/* @ts-ignore: explanation */',
			options: ['single-line'],
		},
		{
			code: '/* @ts-expect-error: explanation */',
			options: ['single-line'],
		},
		{
			code: '/*@__PURE__*/\nfoo();',
			options: ['single-line'],
		},
		{
			code: '/*#__NO_SIDE_EFFECTS__*/\nfunction foo() {}',
			options: ['single-line'],
		},
	],
	invalid: [
		{
			code: '/* Value. */',
			output: '/*\nValue.\n*/',
			errors: [{...error, line: 1, column: 1}],
		},
		{
			code: '/** Value. */',
			output: '/**\nValue.\n*/',
			errors: [error],
		},
		{
			code: '/*** Value */',
			output: '/*\n** Value\n*/',
			errors: [error],
		},
		{
			code: '/*\nValue.\n*/',
			options: ['single-line'],
			output: '/* Value. */',
			errors: [error],
		},
		{
			code: '/**\nValue.\n*/',
			options: ['single-line'],
			output: '/** Value. */',
			errors: [error],
		},
		{
			code: '\t/** Value. */',
			output: '\t/**\n\tValue.\n\t*/',
			errors: [{...error, line: 1, column: 2}],
		},
		{
			code: '\t/* Value. */',
			output: '\t/*\n\tValue.\n\t*/',
			errors: [error],
		},
		{
			code: '/* Value. */\r\n',
			output: '/*\r\nValue.\r\n*/\r\n',
			errors: [error],
		},
		{
			code: '/* Value. */\r',
			output: '/*\rValue.\r*/\r',
			errors: [error],
		},
		{
			code: '/* Value. */\u2028const value = 1;',
			output: '/*\u2028Value.\u2028*/\u2028const value = 1;',
			errors: [error],
		},
		{
			code: '/** Value. */\u2029const value = 1;',
			output: '/**\u2029Value.\u2029*/\u2029const value = 1;',
			errors: [error],
		},
		{
			code: '\t/**\r\nValue.\r\n\t*/',
			options: ['single-line'],
			output: '\t/** Value. */',
			errors: [error],
		},
		{
			code: '/** Value. */\r\n',
			output: '/**\r\nValue.\r\n*/\r\n',
			errors: [error],
		},
		{
			code: '/*\r\nValue.\r\n*/',
			options: ['single-line'],
			output: '/* Value. */',
			errors: [error],
		},
		{
			code: '/*\rValue.\r*/',
			options: ['single-line'],
			output: '/* Value. */',
			errors: [error],
		},
		{
			code: '/*\u2028Value.\u2028*/\u2028const value = 1;',
			options: ['single-line'],
			output: '/* Value. */\u2028const value = 1;',
			errors: [error],
		},
		{
			code: '/*\n\nValue.\n\n*/',
			output: '/*\nValue.\n*/',
			errors: [error],
		},
		{
			code: '/*\n\nValue.\n\n*/',
			options: ['single-line'],
			output: '/* Value. */',
			errors: [error],
		},
		{
			code: '/**\u2029Value.\u2029*/\u2029const value = 1;',
			options: ['single-line'],
			output: '/** Value. */\u2029const value = 1;',
			errors: [error],
		},
		{
			code: '/**\n * Value.\n */',
			options: ['single-line'],
			output: '/** * Value. */',
			errors: [error],
		},
		{
			code: '/** * Value. */',
			output: '/**\n* Value.\n*/',
			errors: [error],
		},
		{
			code: '/* * */',
			output: '/*\n*\n*/',
			errors: [error],
		},
		{
			code: '/*\n*\n*/',
			options: ['single-line'],
			output: '/* * */',
			errors: [error],
		},
		{
			code: '/* eslinted */',
			output: '/*\neslinted\n*/',
			errors: [error],
		},
		{
			code: '/* globalize */',
			output: '/*\nglobalize\n*/',
			errors: [error],
		},
		{
			code: '/* exportedValue */',
			output: '/*\nexportedValue\n*/',
			errors: [error],
		},
		{
			code: '/* prettier-ignorefoo */',
			output: '/*\nprettier-ignorefoo\n*/',
			errors: [error],
		},
		{
			code: '/* prettier-ignore-foo */',
			output: '/*\nprettier-ignore-foo\n*/',
			errors: [error],
		},
		{
			code: '/* @__PURE__ extra */',
			output: '/*\n@__PURE__ extra\n*/',
			errors: [error],
		},
		{
			code: '/* @ts-ignore-foo */',
			output: '/*\n@ts-ignore-foo\n*/',
			errors: [error],
		},
		{
			code: '/* * global value */',
			output: '/*\n* global value\n*/',
			errors: [error],
		},
		{
			code: '/*\n * Value.\n */',
			options: ['single-line'],
			output: '/* * Value. */',
			errors: [error],
		},
		{
			code: 'const value = 1;\nconst otherValue = 2;\r\n/** Value. */',
			output: 'const value = 1;\nconst otherValue = 2;\r\n/**\r\nValue.\r\n*/',
			errors: [error],
		},
		{
			code: '/**\n *\n * Value.\n */',
			output: '/**\n* Value.\n*/',
			errors: [error],
		},
		{
			code: '/**\n *\n * Value.\n */',
			options: ['single-line'],
			output: '/** * Value. */',
			errors: [error],
		},
		{
			code: '/* First. */\n/** Second. */',
			output: '/*\nFirst.\n*/\n/**\nSecond.\n*/',
			errors: [error, error],
		},
	],
});

test('autofixes are idempotent', t => {
	const testCases = [
		{
			code: '/* Value */',
			output: '/*\nValue\n*/',
			options: [],
		},
		{
			code: '/** Value */',
			output: '/**\nValue\n*/',
			options: [],
		},
		{
			code: '/**\nValue\n*/',
			output: '/** Value */',
			options: ['single-line'],
		},
		{
			code: '/*\nValue\n*/',
			output: '/* Value */',
			options: ['single-line'],
		},
		{
			code: '/* * */',
			output: '/*\n*\n*/',
			options: [],
		},
		{
			code: '/*\n*\n*/',
			output: '/* * */',
			options: ['single-line'],
		},
		{
			code: '\t/**\r\nValue.\r\n\t*/',
			output: '\t/** Value. */',
			options: ['single-line'],
		},
		{
			code: '/**\n * Value.\n */',
			output: '/** * Value. */',
			options: ['single-line'],
		},
		{
			code: '/** * Value. */',
			output: '/**\n* Value.\n*/',
			options: [],
		},
	];

	for (const {code, output, options} of testCases) {
		const linter = new Linter();
		const config = getConfig(options);
		const firstFix = linter.verifyAndFix(code, config);

		t.is(firstFix.output, output);
		t.deepEqual(firstFix.messages, []);

		const secondFix = linter.verifyAndFix(firstFix.output, config);
		t.is(secondFix.output, output);
		t.deepEqual(secondFix.messages, []);
	}
});
