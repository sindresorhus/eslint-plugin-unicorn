import test from 'ava';
import {Linter} from 'eslint';
import {getTester, languages, parsers} from './utils/test.js';

const {test: testRule, rule} = getTester(import.meta);

testRule.snapshot({
	valid: [
		'const value = 1;',
		'  const value = 1;',
		'\tconst value = 1;',
		' \t ',
		'const value = 1;\n\n\n',
		'// Comment\n\nconst value = 1;',
		'/*\n\nComment\n*/',
		'`\n\nvalue`;',
		'#!/usr/bin/env node\n\nconsole.log("value");',
		'\u00A0\nconst value = 1;',
		'\u2028const value = 1;',
		'\uFEFFconst value = 1;',
		'\n/* eslint rule-to-test/no-leading-empty-lines: off */\nconst value = 1;',
	],
	invalid: [
		'\nconst value = 1;',
		'\n\n\nconst value = 1;',
		' \t\n\t \n  const value = 1;',
		'\r\n\r\n\tconst value = 1;\r\n',
		' \r\rconst value = 1;\r',
		'\n\r\n\rconst value = 1;\n',
		'\n\n',
		' \n\t \n  ',
		'\n// Comment\n\nconst value = 1;',
		'\n/*\n\nComment\n*/',
		'\n`\n\nvalue`;',
		'\n\u00A0\nconst value = 1;',
		{code: '\nconst value = "value" as string;', languageOptions: {parser: parsers.typescript}},
		{code: '\n<div />;', languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
		{code: '\n<template><div /></template>\n<script>\n\n</script>', languageOptions: {parser: parsers.vue}},
		{code: '\n<!-- Comment -->\n<div>\n\nText\n</div>', languageOptions: {parser: parsers.html}},
	],
});

const languageCases = [
	{language: languages.css, code: '  a { color: red; }\n\n'},
	{language: languages.json, code: '  {"value": 1}\n\n'},
	{language: languages.jsonc, code: '// Comment\n\n{"value": 1}'},
	{language: languages.json5, code: '{value: "first\\\n\\\nlast"}\n\n'},
	{language: languages.html, code: '  <!-- Comment -->\n<pre>\n\nText\n</pre>\n\n'},
	{language: languages.markdown, code: '    indented code\n\n\nParagraph\n\n'},
	{language: {...languages.markdown, language: 'markdown/gfm'}, code: '# Title\n\n- [x] Task\n\n'},
	{language: languages.toml, code: '# Comment\nvalue = """\n\nText\n"""\n\n'},
	{language: languages.yaml, code: '# Comment\n---\nvalue: |+\n\n  Text\n\n\n'},
];

for (const {language, code} of languageCases) {
	testRule.snapshot({
		valid: [{code, language}],
		invalid: [
			{code: `\n${code}`, language},
			{code: ` \t\r\n\r\n${code}`, language},
		],
	});

	test(`preserves content and BOM: ${language.language}`, t => {
		const linter = new Linter();
		const config = {
			files: ['**'],
			language: language.language,
			plugins: {...language.plugins, unicorn: {rules: {'no-leading-empty-lines': rule}}},
			rules: {'unicorn/no-leading-empty-lines': 'error'},
		};
		const input = `\uFEFF \t\r\n\r\n${code}`;
		const messages = linter.verify(input, config);
		t.is(messages.length, 1);
		t.is(messages[0].messageId, 'no-leading-empty-lines');
		const result = linter.verifyAndFix(input, config);
		t.true(result.fixed);
		t.is(result.output, `\uFEFF${code}`);
		t.deepEqual(result.messages, []);
		t.false(linter.verifyAndFix(result.output, config).fixed);
	});
}

test('ignores virtual files from processors', t => {
	const linter = new Linter();
	const messages = linter.verify('Physical file', [
		{
			files: ['**/*.txt'],
			processor: {
				preprocess: () => [{text: '\n\ndebugger;', filename: 'block.js'}],
				postprocess: messages => messages.flat(),
			},
		},
		{
			files: ['**/*.js'],
			plugins: {unicorn: {rules: {'no-leading-empty-lines': rule}}},
			rules: {'unicorn/no-leading-empty-lines': 'error', 'no-debugger': 'error'},
		},
	], {filename: 'document.txt'});
	t.deepEqual(messages.map(({ruleId}) => ruleId), ['no-debugger']);
});

test('checks processor output that retains the physical filename', t => {
	const linter = new Linter();
	const config = {
		processor: {
			preprocess: text => [text],
			postprocess: messages => messages.flat(),
			supportsAutofix: true,
		},
		plugins: {unicorn: {rules: {'no-leading-empty-lines': rule}}},
		rules: {'unicorn/no-leading-empty-lines': 'error'},
	};
	const input = '\n\n  const value = 3;';
	const messages = linter.verify(input, config);
	t.is(messages.length, 1);
	t.is(messages[0].messageId, 'no-leading-empty-lines');
	const result = linter.verifyAndFix(input, config);
	t.true(result.fixed);
	t.is(result.output, '  const value = 3;');
	t.deepEqual(result.messages, []);
});

test('fixes whitespace-only files in native languages', t => {
	const linter = new Linter();
	for (const {language, plugins} of [languages.css, languages.html, languages.markdown, languages.toml, languages.yaml]) {
		const config = {
			files: ['**'],
			language,
			plugins: {...plugins, unicorn: {rules: {'no-leading-empty-lines': rule}}},
			rules: {'unicorn/no-leading-empty-lines': 'error'},
		};
		t.deepEqual(linter.verify(' \t ', config), []);
		const messages = linter.verify(' \t\r\n\n', config);
		t.is(messages.length, 1);
		t.is(messages[0].messageId, 'no-leading-empty-lines');
		const result = linter.verifyAndFix(' \t\r\n\n', config);
		t.true(result.fixed);
		t.is(result.output, '');
		t.deepEqual(result.messages, []);
	}
});

testRule({
	valid: [],
	invalid: [
		{
			code: '\uFEFF\n\n  const value = 2;',
			output: '\uFEFF  const value = 2;',
			errors: [{
				messageId: 'no-leading-empty-lines', line: 1, column: 1, endLine: 3, endColumn: 1,
			}],
		},
	],
});
