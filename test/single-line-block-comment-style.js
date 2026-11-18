import test from 'node:test';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

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
		'/*\nFirst line.\nSecond line.\n*/',
		'const value = /* Get the value. */ 1;',
		'const value = /** Get the value. */ 1;',
		'/** Get the value. */ const value = 1;',
		'const value = 1; /** Get the value. */',
		'/* eslint-disable no-console */',
		'/* eslint-enable no-console */',
		'/* eslint-disable-next-line no-console */',
		'/* eslint-disable-line no-console */',
		'/* jshint esversion: 6 */',
		'/* jslint browser */',
		'/* jscs:disable */',
		'/* tslint:disable */',
		'/* flowlint sketchy-null:off */',
		'/* flowlint-next-line sketchy-null:off */',
		'/*:: type MyAlias = string; */',
		'/*: MyAlias */',
		'/*:string*/',
		'/*flow-include prop: string; */',
		outdent`
			/*::
			type MyAlias = string;
			*/
		`,
		outdent`
			/*
			 * flowlint-line sketchy-null:off
			 */
		`,
		'/** jshint esversion: 6 */',
		'/** prettier-ignore */',
		'/** @noformat */',
		'/* global value */',
		'/* prettier-ignore */',
		'/* @ts-ignore */',
		'/*# sourceMappingURL=app.js.map */',
		'/*@ sourceMappingURL=legacy.js.map */',
		'/*# sourceURL=app.js */',
		'/* @ts-ignore: explanation */',
		'/* @ts-expect-error: explanation */',
		'/* @jsxImportSource preact */',
		'/* @flow strict */',
		'/* @jest-environment node */',
		'/* @noformat */',
		'/* @noprettier */',
		'/* $FlowFixMe[prop-missing] */',
		'/* $FlowExpectedError[incompatible-type] */',
		'/* c8 ignore next */',
		'/* istanbul ignore next */',
		'/* nyc ignore next */',
		'/* v8 ignore next */',
		'/* node:coverage ignore next */',
		'/* node:coverage ignore next 3 */',
		'/* node:coverage disable */',
		'/* node:coverage enable */',
		'/* biome-ignore lint/suspicious/noExplicitAny */',
		'/* deno-lint-ignore no-explicit-any */',
		'/* deno-lint-ignore-file */',
		'/* dprint-ignore */',
		'/* dprint-ignore-file */',
		'/* oxlint-disable-line no-console */',
		'/* oxlint-disable no-console */',
		'/* oxlint-enable no-console */',
		'/* biome-ignore-all lint/suspicious/noExplicitAny */',
		'/* cspell:ignore foo */',
		'/* spell-checker:ignore foo */',
		'/**/',
		'/* */',
		'/*\n*\n*/',
		'/***\n** Value\n*/',
		'/**\n *\n */',
		'/**\n*\n*/',
		'/**\n* Value.\n*/',
		'/*\n\n*/',
		'/**\n\n*/',
		'/**\n * Value.\n */',
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
			code: '/**\n * Value.\n */',
			options: ['single-line'],
		},
		{
			code: '/** * Value. */',
			options: ['multiline'],
		},
		{
			code: '\t/** Value. */',
			options: ['single-line'],
		},
		{
			code: '\t/* Value. */',
			options: ['single-line'],
		},
		{
			code: '/**\n * First.\n * Second.\n */',
			options: ['single-line'],
		},
		{
			code: '/**\nFirst line.\nSecond line.\n*/',
			options: ['single-line'],
		},
		{
			code: '/*\n\n*/',
			options: ['single-line'],
		},
		{
			code: '/**\n\n*/',
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
		// Not a Node.js coverage directive
		'/* node:coverage report */',
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

test('suggests merging a run of adjacent block comments', t => {
	const linter = new Linter();
	const config = getConfig([]);
	const code = '  /* First. */\r\n  /* Second. */\r\n  /* Third. */\r\n  doSomething();';
	const messages = linter.verify(code, config);
	const [message, ...remainingMessages] = messages;

	t.assert.strictEqual(messages.length, 3);
	t.assert.deepStrictEqual(message.suggestions?.map(({messageId}) => messageId), ['merge-adjacent-block-comments']);
	t.assert.ok(remainingMessages.every(({suggestions}) => suggestions === undefined));

	const {range, text} = message.suggestions[0].fix;
	const [start, end] = range;
	const merged = code.slice(0, start) + text + code.slice(end);
	t.assert.strictEqual(merged, '  /*\r\n  First.\r\n  Second.\r\n  Third.\r\n  */\r\n  doSomething();');
	t.assert.deepStrictEqual(linter.verify(merged, config), []);

	const fixed = linter.verifyAndFix(code, config);
	t.assert.strictEqual(fixed.output, '  /*\r\n  First.\r\n  */\r\n  /*\r\n  Second.\r\n  */\r\n  /*\r\n  Third.\r\n  */\r\n  doSomething();');
	t.assert.deepStrictEqual(fixed.messages, []);
});

ruleTest({
	valid: [],
	invalid: [{
		code: '\uFEFF/* First. */\r/* Second. */\r',
		output: '\uFEFF/*\rFirst.\r*/\r/*\rSecond.\r*/\r',
		errors: [
			{
				...error,
				suggestions: [{
					messageId: 'merge-adjacent-block-comments',
					output: '\uFEFF/*\rFirst.\rSecond.\r*/\r',
				}],
			},
			{...error, suggestions: 0},
		],
	}],
});

test('does not suggest merging across a boundary', t => {
	const linter = new Linter();
	const config = getConfig(['multiline', {ignore: ['^Generated']}]);

	for (const boundary of [
		'',
		' \t',
		'prepare();',
		'// An intervening comment.',
		'/*\nMultiple\ncontent lines.\n*/',
		'/** Documentation. */',
		'/*** Section heading ***/',
		'/* Section heading ***/',
		'/*! License. */',
		'/* Copyright (c) Example. */',
		'/* © Example. */',
		'/* @LICENSE MIT */',
		'/* SPDX-License-Identifier: MIT */',
		'/* @__PURE__ extra */',
		'/* */',
		'/* Generated comment. */',
		'/* prettier-ignore */',
		'/* @format */',
		'/* * @prettier */',
		'/* stylelint-disable-next-line color-no-invalid-hex */',
		'/* AUTOPREFIXER: IGNORE NEXT */',
		'/*rtl:ignore*/',
		'/* !rtl:ignore */',
		'/* @vite-ignore */',
		'/* webpackChunkName: "details" */',
	]) {
		const code = `/* First. */\n${boundary}\n/* Second. */`;
		const messages = linter.verify(code, config);

		t.assert.ok(messages.length >= 2, code);
		t.assert.ok(messages.every(({messageId, suggestions}) => messageId === error.messageId && suggestions === undefined), code);
	}

	for (const code of [
		'/* First. */\n  /* Second. */',
		'/* v8 */\n/* ignore next */',
		'/* Begin: purgecss start ignore */\n/* End: purgecss end ignore */',
		'import(\n  /* webpackChunkName: "details" */\n  /* webpackMode: "lazy" */\n  "./details.js"\n);',
	]) {
		const messages = linter.verify(code, config);

		t.assert.strictEqual(messages.length, 2, code);
		t.assert.ok(messages.every(({messageId, suggestions}) => messageId === error.messageId && suggestions === undefined), code);
	}
});

test('checks ignore patterns against the combined content', t => {
	const linter = new Linter();
	const config = getConfig(['multiline', {ignore: [/^First\.\nSecond\.$/u]}]);
	const messages = linter.verify('/* First. */\n/* Second. */', config);

	t.assert.strictEqual(messages.length, 2);
	t.assert.ok(messages.every(({messageId, suggestions}) => messageId === error.messageId && suggestions === undefined));
});

test('suggests separate merges on each side of a line comment', t => {
	const linter = new Linter();
	const code = '/* First. */\n/* Second. */\n// A separate comment.\n/* Third. */\n/* Fourth. */';
	const messages = linter.verify(code, getConfig([]));
	const suggestedEdits = messages.flatMap(({suggestions}) => suggestions ?? []).map(({fix}) => fix);

	t.assert.deepStrictEqual(suggestedEdits, [
		{range: [0, code.indexOf('\n//')], text: '/*\nFirst.\nSecond.\n*/'},
		{range: [code.indexOf('/* Third.'), code.length], text: '/*\nThird.\nFourth.\n*/'},
	]);
});

test('does not merge a comment whose diagnostic is suppressed', t => {
	const linter = new Linter();
	const code = '// eslint-disable-next-line rule/single-line-block-comment-style\n/* First. */\n/* Second. */';
	const messages = linter.verify(code, getConfig([]));

	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].messageId, error.messageId);
	t.assert.strictEqual(messages[0].line, 3);
	t.assert.strictEqual(messages[0].suggestions, undefined);
});

test('suggests merging in languages with block comments', t => {
	const linter = new Linter();
	const {plugins, rules} = getConfig([]);

	for (const [{name, language, plugins: languagePlugins}, codeAfterComments] of [
		[languages.css, 'a {}'],
		[languages.jsonc, '{}'],
		[languages.json5, '{}'],
		[languages.soml, '{}'],
	]) {
		const filename = `file.${name}`;
		const config = {
			files: [filename],
			language,
			plugins: {...plugins, ...languagePlugins},
			rules,
		};
		const lineEnding = name === 'soml' ? '\n' : '\r\n';
		const code = ['/* First. */', '/* Second. */', codeAfterComments].join(lineEnding);
		const [first, second] = linter.verify(code, config, filename);
		const {range, text} = first.suggestions[0].fix;

		const [start, end] = range;
		const output = code.slice(0, start) + text + code.slice(end);
		t.assert.strictEqual(output, ['/*', 'First.', 'Second.', '*/', codeAfterComments].join(lineEnding), name);
		t.assert.deepStrictEqual(linter.verify(output, config, filename), [], name);
		t.assert.strictEqual(second.suggestions, undefined, name);
	}
});

test('preserves CSS comment boundaries', t => {
	const linter = new Linter();
	const {plugins, rules} = getConfig([]);
	const config = {
		files: ['file.css'],
		language: languages.css.language,
		plugins: {...plugins, ...languages.css.plugins},
		rules,
	};

	for (const code of [
		'/* First. */\u2028/* Second. */\na {}',
		'/* First. */\u2029/* Second. */\na {}',
		'div\u2028/* First. */\n/* Second. */\u2029span {}',
		'/* First.\fSecond. */\n/* Third. */\na {}',
	]) {
		const messages = linter.verify(code, config, 'file.css');

		t.assert.strictEqual(messages.length, 2);
		t.assert.ok(messages.every(({messageId, suggestions}) => messageId === error.messageId && suggestions === undefined));
	}

	const code = '/* First. */\n/* Second.';
	const messages = linter.verify(code, config, 'file.css');

	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].messageId, error.messageId);
	t.assert.strictEqual(messages[0].suggestions, undefined);

	const fixed = linter.verifyAndFix(code, config, 'file.css');
	t.assert.strictEqual(fixed.output, '/*\nFirst.\n*/\n/* Second.');
	t.assert.deepStrictEqual(fixed.messages, []);
});

ruleTest({
	valid: [],
	invalid: [{
		code: '/* Overview. */\n/* #region Layout */\na {}\n/* #endregion */',
		output: '/*\nOverview.\n*/\n/* #region Layout */\na {}\n/* #endregion */',
		errors: [{...error, suggestions: 0}],
		language: languages.css.language,
		plugins: languages.css.plugins,
	}],
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
			code: '/***/',
			options: ['single-line'],
		},
		{
			code: '/**\n *\n */',
			options: ['single-line'],
		},
		{
			code: '/** * */',
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
		{
			code: '/*** Value */',
			options: ['single-line'],
		},
		{
			code: '/* eslint rule-to-test/single-line-block-comment-style: [\'error\', \'multiline\'] */',
		},
		{
			code: '/* Generated comment. */',
			options: ['multiline', {ignore: ['^Generated']}],
		},
		{
			code: '/** Generated documentation comment. */',
			options: ['multiline', {ignore: [/^Generated/u]}],
		},
		{
			code: '/* Generated first. */\n/* Generated second. */',
			options: ['multiline', {ignore: [/^Generated/g]}],
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
			code: '/* First. */\n/** Second. */',
			output: '/*\nFirst.\n*/\n/**\nSecond.\n*/',
			errors: [error, error],
		},
		{
			code: '/*\nFirst.\n*/\n/**\nSecond.\n*/',
			options: ['single-line'],
			output: '/* First. */\n/** Second. */',
			errors: [error, error],
		},
		{
			code: '/* Value. */',
			options: ['multiline'],
			output: '/*\nValue.\n*/',
			errors: [error],
		},
		{
			code: '/***/',
			output: '/*\n*\n*/',
			errors: [error],
		},
		{
			code: '/* Named multiline option. */',
			options: ['multiline'],
			output: '/*\nNamed multiline option.\n*/',
			errors: [error],
		},
		{
			code: '/** Named multiline option. */',
			options: ['multiline'],
			output: '/**\nNamed multiline option.\n*/',
			errors: [error],
		},
		{
			code: '/* Mixed position.\n*/',
			output: '/*\nMixed position.\n*/',
			errors: [error],
		},
		{
			code: '/** Mixed position.\n*/',
			output: '/**\nMixed position.\n*/',
			errors: [error],
		},
		{
			code: '/*\nMixed position. */',
			options: ['single-line'],
			output: '/* Mixed position. */',
			errors: [error],
		},
		{
			code: '/**\nMixed position. */',
			options: ['single-line'],
			output: '/** Mixed position. */',
			errors: [error],
		},
		{
			code: '/* $FlowFixMe */',
			output: '/*\n$FlowFixMe\n*/',
			errors: [error],
		},
		{
			code: '/* $FlowFixMe: explanation */',
			output: '/*\n$FlowFixMe: explanation\n*/',
			errors: [error],
		},
		{
			code: '/* $FlowFixMe [prop-missing] */',
			output: '/*\n$FlowFixMe [prop-missing]\n*/',
			errors: [error],
		},
		{
			code: 'if (value) {\r\n\t/* Value. */\n}',
			output: 'if (value) {\r\n\t/*\n\tValue.\n\t*/\n}',
			errors: [{...error, line: 2, column: 2}],
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
			code: '/** * */',
			output: '/** * */',
			options: [],
		},
		{
			code: '/**\n * Value.\n */',
			output: '/**\n * Value.\n */',
			options: ['single-line'],
		},
		{
			code: '/** * Value. */',
			output: '/** * Value. */',
			options: [],
		},
	];

	for (const {code, output, options} of testCases) {
		const linter = new Linter();
		const config = getConfig(options);
		const firstFix = linter.verifyAndFix(code, config);

		t.assert.strictEqual(firstFix.output, output);
		t.assert.deepStrictEqual(firstFix.messages, []);

		const secondFix = linter.verifyAndFix(firstFix.output, config);
		t.assert.strictEqual(secondFix.output, output);
		t.assert.deepStrictEqual(secondFix.messages, []);
	}
});

ruleTest.snapshot({
	valid: [
		...[languages.jsonc, languages.json5, languages.css].flatMap(language => [
			'/*\nComment.\n*/\n{}',
			'/*! License. */\n{}',
			'/* eslint-disable */\n{}',
			'/* Comment. */ {}',
		].map(code => ({code: language === languages.css ? code.replace('{}', 'a {}') : code, language}))),
		{code: '/*# sourceMappingURL=style.css.map */\na {}', language: languages.css},
	],
	invalid: [languages.jsonc, languages.json5, languages.css].flatMap(language => [
		{code: '/* Comment. */\n{}'},
		{code: '  /* Comment. */\r\n{}'},
		{code: '/*\nComment.\n*/\n{}', options: ['single-line']},
	].map(testCase => ({...testCase, code: language === languages.css ? testCase.code.replace('{}', 'a {}') : testCase.code, language}))),
});

ruleTest({
	valid: [languages.jsonc, languages.json5].flatMap(({language, plugins}) => [
		{
			code: '/*\r\nIgnored.\r\n*/\r\n{}',
			options: ['single-line', {ignore: [/^\nIgnored\.\n$/u]}],
			language,
			plugins,
		},
		...['eslint-disable', 'eslint-enable', 'eslint-disable-next-line'].map(directive => ({
			code: `/*\r\n${directive}*/\r\n{}`,
			language,
			plugins,
			linterOptions: {reportUnusedDisableDirectives: 'off'},
		})),
	]),
	invalid: [languages.jsonc, languages.json5].map(({language, plugins}) => ({
		code: '{\r\n\t/*\r\n\tComment.\r\n\t*/\r\n\t"value": true\r\n}',
		output: '{\r\n\t/* Comment. */\r\n\t"value": true\r\n}',
		options: ['single-line'],
		errors: [error],
		language,
		plugins,
	})),
});

ruleTest.snapshot({
	valid: [
		'/*\nnote\n*/\n{}',
		'# note\n{}',
		'value: 1 /* note */',
		'/* eslint-disable rule-to-test/single-line-block-comment-style */\n{}',
	].map(testCase => ({language: languages.soml, ...(typeof testCase === 'string' ? {code: testCase} : testCase)})),
	invalid: [
		'/* note */\n{}',
		'/* note\n*/\n{}',
		{code: '/*\nnote\n*/\n{}', options: ['single-line']},
	].map(testCase => ({language: languages.soml, ...(typeof testCase === 'string' ? {code: testCase} : testCase)})),
});
