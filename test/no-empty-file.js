import outdent from 'outdent';
import {getTester, parsers, languages} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		...[
			'const x = 0;',
			';; const x = 0;',
			'{{{;;const x = 0;}}}',
			outdent`
				'use strict';
				const x = 0;
			`,
			';;\'use strict\';',
			'{\'use strict\';}',
			'("use strict")',
			'`use strict`',
			'({})',
			outdent`
				#!/usr/bin/env node
				console.log('done');
			`,
			'false',
			'("")',
			'NaN',
			'undefined',
			'null',
			'[]',
			'(() => {})()',
		].map(code => ({code, filename: 'example.js'})),
		...[
			'd.ts',
			'ts',
		].map(extension => ({code: '/// <reference types="example" />', filename: `example.${extension}`})),
		// A Vue.js SFC with a `<template>` is not an empty file, even when `<script>` is empty.
		{code: '<template><div/></template>', filename: 'example.vue', languageOptions: {parser: parsers.vue}},
		{code: '<template><div/></template>\n<script></script>', filename: 'example.vue', languageOptions: {parser: parsers.vue}},
		// An HTML file with content is not reported.
		{code: '<div>Hello</div>', filename: 'example.html', languageOptions: {parser: parsers.html}},
		{code: '<!DOCTYPE html>', filename: 'example.html', languageOptions: {parser: parsers.html}},
		// A comment-only HTML file is allowed with `allowComments`.
		{
			code: '<!-- comment -->', filename: 'example.html', options: [{allowComments: true}], languageOptions: {parser: parsers.html},
		},
		// A CSS file with content is not reported.
		{code: 'a { color: red; }', filename: 'example.css', language: languages.css},
		// A comment-only CSS file is allowed with `allowComments`.
		{
			code: '/* comment */', filename: 'example.css', options: [{allowComments: true}], language: languages.css,
		},
		// A Markdown file with content is not reported.
		{code: '# Title', filename: 'example.md', language: languages.markdown},
		// Visible text between two comments is content, even on one line.
		{code: '<!-- a --> text <!-- b -->', filename: 'example.md', language: languages.markdown},
		// A comment-only Markdown file is allowed with `allowComments`.
		{
			code: '<!-- comment -->', filename: 'example.md', options: [{allowComments: true}], language: languages.markdown,
		},
		...[
			'// comment',
			'/* comment */',
			outdent`
				/**
				 * @typedef {object} Foo
				 * @property {string} bar
				 */
			`,
		].map(code => ({code, filename: 'example.js', options: [{allowComments: true}]})),
		{code: '// No need to write tests here.', filename: 'example.test.ts', options: [{allowComments: true}]},
	],
	invalid: [
		...[
			'',
			'\uFEFF',
			' ',
			'\t',
			'\n',
			'\r',
			'\r\n',
			outdent`

			`,
			'// comment',
			'/* comment */',
			'#!/usr/bin/env node',
			'\'use asm\';',
			'\'use strict\';',
			'"use strict"',
			'""',
			';',
			';;',
			'{}',
			'{;;}',
			'{{}}',
		].map(code => ({code, filename: 'example.js'})),
		...[
			'',
			' ',
			'#!/usr/bin/env node',
			outdent`
				#!/usr/bin/env node
				// comment
			`,
			'; // comment',
			'\'use strict\'; // comment',
			'{/* comment */}',
		].map(code => ({code, filename: 'example.js', options: [{allowComments: true}]})),
		...[
			'mjs',
			'cJs',
			'ts',
			'tsx',
			'jsx',
			'MTS',
			'cts',
		].map(extension => ({code: '{}', filename: `example.${extension}`})),
		// Empty standalone files of any extension are reported.
		...[
			'md',
			'vue',
			'svelte',
			'astro',
			'css',
			'txt',
		].map(extension => ({code: '', filename: `example.${extension}`})),
		// A fully empty Vue.js SFC is reported.
		{code: '', filename: 'example.vue', languageOptions: {parser: parsers.vue}},
		// Empty, whitespace-only, and comment-only HTML files are reported.
		{code: '', filename: 'example.html', languageOptions: {parser: parsers.html}},
		{code: '   \n\t ', filename: 'example.html', languageOptions: {parser: parsers.html}},
		{code: '<!-- comment -->', filename: 'example.html', languageOptions: {parser: parsers.html}},
		// Empty, whitespace-only, and comment-only CSS files are reported.
		{code: '', filename: 'example.css', language: languages.css},
		{code: '   \n\t ', filename: 'example.css', language: languages.css},
		{code: '/* comment */', filename: 'example.css', language: languages.css},
		// Empty, whitespace-only, and comment-only Markdown files are reported.
		{code: '', filename: 'example.md', language: languages.markdown},
		{code: '   \n\t ', filename: 'example.md', language: languages.markdown},
		{code: '<!-- comment -->', filename: 'example.md', language: languages.markdown},
	],
});

// Test for https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2175
test.typescript({
	valid: [
		{code: '(() => {})();', filename: 'example.ts'},
	],
	invalid: [
		{code: '"";', filename: 'example.ts', errors: 1},
		{code: '"use strict";', filename: 'example.ts', errors: 1},
	],
});
