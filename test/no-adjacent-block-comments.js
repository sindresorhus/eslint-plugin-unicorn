import test from 'node:test';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {getTester, languages} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);
const error = {messageId: 'no-adjacent-block-comments'};
const mergeRule = 'unicorn/no-adjacent-block-comments';
const layoutRule = 'unicorn/single-line-block-comment-style';

ruleTest({
	valid: [
		...[
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
			'/* prettier-ignore */',
			'/* @format */',
			'/* * @prettier */',
			'/*/ @ts-expect-error: Intentional fixture. */',
			'/* stylelint-disable-next-line color-no-invalid-hex */',
			'/* AUTOPREFIXER: IGNORE NEXT */',
			'/*rtl:ignore*/',
			'/* !rtl:ignore */',
			'/* @vite-ignore */',
			'/* #region Layout */',
			'/* webpackChunkName: "details" */',
		].map(boundary => `/* First. */\n${boundary}\n/* Second. */`),
		'/* First. */\n  /* Second. */',
		'doSomething(); /* First. */\n/* Second. */',
		'/* First. */\n/* Second. */ doSomething();',
		'/*\nFirst.\nSecond.\n*/\n/* Third. */',
		'/* v8 */\n/* ignore next */',
		'/* Begin: purgecss start ignore */\n/* End: purgecss end ignore */',
		'import(\n  /* webpackChunkName: "details" */\n  /* webpackMode: "lazy" */\n  "./details.js"\n);',
		'// eslint-disable-next-line rule-to-test/no-adjacent-block-comments\n/* First. */\n/* Second. */',
		{
			code: '/* First. */\n/*\nGenerated.\n*/\n/* Second. */',
			options: [{ignore: ['^Generated']}],
		},
		{
			code: '/* First. */\n/* Second. */',
			options: [{ignore: [/^First\.\nSecond\.$/u]}],
		},
		...[
			'/* First. */\u2028/* Second. */\na {}',
			'/* First. */\u2029/* Second. */\na {}',
			'div\u2028/* First. */\n/* Second. */\u2029span {}',
			'/* First.\fSecond. */\n/* Third. */\na {}',
			'/* First. */\n/* Second.',
		].map(code => ({code, language: languages.css.language, plugins: languages.css.plugins})),
	],
	invalid: [
		{
			code: '/* First. */\n/* Second. */',
			output: '/*\nFirst.\nSecond.\n*/',
			errors: [error],
		},
		{
			code: '/*\nFirst.\n*/\n/*\nSecond.\n*/',
			output: '/*\nFirst.\nSecond.\n*/',
			errors: [error],
		},
		{
			code: 'function read() {\n\treturn\n\t/* First. */\n\t/* Second. */\n\t42;\n}',
			output: 'function read() {\n\treturn\n\t/*\n\tFirst.\n\tSecond.\n\t*/\n\t42;\n}',
			errors: [error],
		},
		{
			code: '  /* First. */\r\n  /*\r\n  Second.\r\n  */\r\n  /* Third. */\r\n  doSomething();',
			output: '  /*\r\n  First.\r\n  Second.\r\n  Third.\r\n  */\r\n  doSomething();',
			errors: [error],
		},
		{
			code: '/* First. */\n/* Second. */\n// A separate comment.\n/* Third. */\n/* Fourth. */',
			output: '/*\nFirst.\nSecond.\n*/\n// A separate comment.\n/*\nThird.\nFourth.\n*/',
			errors: [error, error],
		},
		{
			code: '\uFEFF/* First. */\r/* Second. */\r',
			output: '\uFEFF/*\rFirst.\rSecond.\r*/\r',
			errors: [error],
		},
		{
			code: 'first: 1\n/* First. */\n/* Second. */\nsecond: 2',
			output: 'first: 1\n/*\nFirst.\nSecond.\n*/\nsecond: 2',
			errors: [error],
			language: languages.soml.language,
			plugins: languages.soml.plugins,
		},
		...[languages.css, languages.jsonc, languages.json5].map(({name, language, plugins}) => {
			const body = name === 'css' ? 'a {}' : '{}';
			return {
				code: ['/* First. */', '/*', 'Second.', '*/', body].join('\r\n'),
				output: ['/*', 'First.', 'Second.', '*/', body].join('\r\n'),
				errors: [error],
				language,
				plugins,
			};
		}),
	],
});

ruleTest.vue({
	valid: [],
	invalid: [{
		filename: 'component.vue',
		code: '<template><!-- 🦄 /* Keep. */ --></template>\r\n<script setup>\r\n/* First. */\r\n/* Second. */\r\n</script>',
		output: '<template><!-- 🦄 /* Keep. */ --></template>\r\n<script setup>\r\n/*\r\nFirst.\r\nSecond.\r\n*/\r\n</script>',
		errors: [error],
	}],
});

test('merges with the block comment layout rule enabled', t => {
	const linter = new Linter();

	for (const [style, code] of [
		['multiline', '/* First. */\n/* Second. */'],
		['single-line', '/*\nFirst.\n*/\n/*\nSecond.\n*/'],
	]) {
		const config = {
			plugins: {unicorn},
			rules: {[layoutRule]: ['error', style], [mergeRule]: 'error'},
		};
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.output, '/*\nFirst.\nSecond.\n*/', style);
		t.assert.deepStrictEqual(result.messages, [], style);
	}
});

test('keeps merge boundaries intact after layout fixes', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn},
		rules: {[layoutRule]: 'error', [mergeRule]: ['error', {ignore: ['^Generated']}]},
	};

	const emacsModeline = '/* config.js -*- mode: js; indent-tabs-mode: t -*- */';
	const vimModeline = '/* vim: set ft=javascript: */';
	const typescriptDirective = '/*/ @ts-expect-error: Intentional fixture. */';

	for (const [comment, formatted] of [
		['/* Generated. */', '/*\nGenerated.\n*/'],
		['/*** Section ***/', '/*\n** Section **\n*/'],
		['/* Section ***/', '/*\nSection **\n*/'],
		[emacsModeline, emacsModeline],
		[vimModeline, vimModeline],
		[typescriptDirective, typescriptDirective],
	]) {
		const result = linter.verifyAndFix(`${comment}\n/* Next. */`, config);
		t.assert.strictEqual(result.output, `${formatted}\n/*\nNext.\n*/`, comment);
		t.assert.deepStrictEqual(result.messages, [], comment);
	}
});
