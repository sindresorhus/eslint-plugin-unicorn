import test from 'ava';
import {Linter} from 'eslint';
import css from '@eslint/css';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import html from '@html-eslint/eslint-plugin';
import unicorn from '../index.js';
import {getTester} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

ruleTest.snapshot({
	testerOptions: {
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
	},
	valid: [
		'const url = "https://sindresorhus.com";',
		'const url = "http://localhost";',
		'const url = "http://example";',
		'const url = "http://127.0.0.1";',
		'const url = "http://[::1]";',
		'const url = "http://example.123";',
		'// http://example,',
		'// http://localhost',
		'const element = <a href="https://sindresorhus.com">https://sindresorhus.com</a>;',
		`// eslint-disable-next-line rule-to-test/prefer-https
		// http://sindresorhus.com`,
	],
	invalid: [
		'const url = "http://sindresorhus.com";',
		'const url = `http://sindresorhus.com/path`;',
		'// http://sindresorhus.com',
		'// http://sindresorhus.com,',
		'const element = <a href="http://sindresorhus.com">https://sindresorhus.com</a>;',
		'const element = <a href="https://sindresorhus.com">http://sindresorhus.com</a>;',
		`const urls = [
			"http://sindresorhus.com",
			"http://example.com",
		];`,
		'const url = "http://sindresorhus.com:8080/path";',
		'const url = "http://sindresorhus.com.";',
	],
});

function verifyAndFix(code, config, filename) {
	const linter = new Linter({configType: 'flat'});

	return linter.verifyAndFix(code, config, {filename});
}

function verify(code, config, filename) {
	const linter = new Linter({configType: 'flat'});

	return linter.verify(code, config, {filename});
}

function createLanguageConfig({language, plugins}) {
	return {
		files: ['**'],
		language,
		plugins: {
			...plugins,
			unicorn,
		},
		rules: {
			'unicorn/prefer-https': 'error',
		},
	};
}

const languageCases = [
	{
		name: 'CSS',
		filename: 'fixture.css',
		config: createLanguageConfig({
			language: 'css/css',
			plugins: {css},
		}),
		code: '.logo { background-image: url("http://sindresorhus.com/logo.svg"); }',
		output: '.logo { background-image: url("https://sindresorhus.com/logo.svg"); }',
		errors: 1,
	},
	{
		name: 'JSON',
		filename: 'fixture.json',
		config: createLanguageConfig({
			language: 'json/json',
			plugins: {json},
		}),
		code: '{"url": "http://sindresorhus.com"}',
		output: '{"url": "https://sindresorhus.com"}',
		errors: 1,
	},
	{
		name: 'JSONC',
		filename: 'fixture.jsonc',
		config: createLanguageConfig({
			language: 'json/jsonc',
			plugins: {json},
		}),
		code: `{
			// http://sindresorhus.com
			"url": "http://example.com"
		}`,
		output: `{
			// https://sindresorhus.com
			"url": "https://example.com"
		}`,
		errors: 2,
	},
	{
		name: 'JSON5',
		filename: 'fixture.json5',
		config: createLanguageConfig({
			language: 'json/json5',
			plugins: {json},
		}),
		code: '{url: "http://sindresorhus.com"}',
		output: '{url: "https://sindresorhus.com"}',
		errors: 1,
	},
	{
		name: 'HTML',
		filename: 'fixture.html',
		config: createLanguageConfig({
			language: 'html/html',
			plugins: {html},
		}),
		code: '<a href="http://sindresorhus.com">http://example.com</a>',
		output: '<a href="https://sindresorhus.com">https://example.com</a>',
		errors: 2,
	},
	{
		name: 'CommonMark',
		filename: 'fixture.md',
		config: createLanguageConfig({
			language: 'markdown/commonmark',
			plugins: {markdown},
		}),
		code: '[Sindre](http://sindresorhus.com)',
		output: '[Sindre](https://sindresorhus.com)',
		errors: 1,
	},
	{
		name: 'GFM',
		filename: 'fixture.md',
		config: createLanguageConfig({
			language: 'markdown/gfm',
			plugins: {markdown},
		}),
		code: '| URL |\n| --- |\n| http://sindresorhus.com |',
		output: '| URL |\n| --- |\n| https://sindresorhus.com |',
		errors: 1,
	},
];

for (const {name, code, output, config, filename, errors} of languageCases) {
	test(`supports ${name}`, t => {
		const messages = verify(code, config, filename);
		const result = verifyAndFix(code, config, filename);

		t.true(result.fixed);
		t.is(result.output, output);
		t.deepEqual(
			messages.map(({message, ruleId}) => ({message, ruleId})),
			Array.from({length: errors}, () => (
				{
					message: 'Prefer HTTPS over HTTP.',
					ruleId: 'unicorn/prefer-https',
				}
			)),
		);
	});
}
