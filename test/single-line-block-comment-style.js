import test from 'ava';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test: ruleTest, rule} = getTester(import.meta);

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
		'/* eslint-disable rule-to-test/single-line-block-comment-style */',
		'/* global value */',
		'/* prettier-ignore */',
		'/* @ts-ignore */',
		'/* c8 ignore next */',
		'/* v8 ignore next */',
		'/* biome-ignore lint/suspicious/noExplicitAny */',
		'/* oxlint-disable no-console */',
		'/* oxlint-enable no-console */',
		'/**/',
		'/* */',
		'/* * */',
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
		{
			code: '/** Another value. */',
			options: ['single-line'],
		},
		{
			code: '/* Another value. */',
			options: ['single-line'],
		},
		{
			code: '/*** Value */',
			options: ['single-line'],
		},
		{
			code: '/**\r\nGet the value.\r\n*/',
		},
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

test('autofixes are idempotent', t => {
	const testCases = [
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
