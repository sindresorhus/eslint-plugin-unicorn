import test from 'ava';
import {Linter} from 'eslint';
import css from '@eslint/css';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import html from '@html-eslint/eslint-plugin';
import unicorn from '../index.js';
import {getTester} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

const MESSAGE = 'Prefer HTTPS over HTTP.';
const RULE_ID = 'unicorn/prefer-https';
const LANGUAGE_PLUGINS = {
	css,
	json,
	markdown,
	html,
};

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
		'const url = "HTTP://sindresorhus.com";',
		'const url = "http://localhost";',
		'const url = "http://example";',
		'const url = "http://127.0.0.1";',
		'const url = "http://[::1]";',
		'const url = "http://example.123";',
		'const url = "http://sindresorhus.com:invalid";',
		'const text = "prefixhttp://sindresorhus.com";',
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
		'const url = "http://user:password@sindresorhus.com";',
		'const url = "http://êxample.com";',
		'const url = "http://sindresorhus.com:8080/path";',
		'const url = "http://sindresorhus.com.";',
	],
});

function createLanguageConfig(language) {
	const pluginName = language.split('/', 1)[0];

	return {
		files: ['**'],
		language,
		plugins: {
			[pluginName]: LANGUAGE_PLUGINS[pluginName],
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
		language: 'css/css',
		code: '.logo { background-image: url("http://sindresorhus.com/logo.svg"); }',
		output: '.logo { background-image: url("https://sindresorhus.com/logo.svg"); }',
		errors: 1,
	},
	{
		name: 'JSON',
		filename: 'fixture.json',
		language: 'json/json',
		code: '{"url": "http://sindresorhus.com"}',
		output: '{"url": "https://sindresorhus.com"}',
		errors: 1,
	},
	{
		name: 'JSONC',
		filename: 'fixture.jsonc',
		language: 'json/jsonc',
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
		language: 'json/json5',
		code: '{url: "http://sindresorhus.com"}',
		output: '{url: "https://sindresorhus.com"}',
		errors: 1,
	},
	{
		name: 'HTML',
		filename: 'fixture.html',
		language: 'html/html',
		code: '<a href="http://sindresorhus.com">http://example.com</a>',
		output: '<a href="https://sindresorhus.com">https://example.com</a>',
		errors: 2,
	},
	{
		name: 'CommonMark',
		filename: 'fixture.md',
		language: 'markdown/commonmark',
		code: '[Sindre](http://sindresorhus.com)',
		output: '[Sindre](https://sindresorhus.com)',
		errors: 1,
	},
	{
		name: 'GFM',
		filename: 'fixture.md',
		language: 'markdown/gfm',
		code: '| URL |\n| --- |\n| http://sindresorhus.com |',
		output: '| URL |\n| --- |\n| https://sindresorhus.com |',
		errors: 1,
	},
];

for (const {name, code, output, language, filename, errors} of languageCases) {
	test(`supports ${name}`, t => {
		const config = createLanguageConfig(language);
		const linter = new Linter({configType: 'flat'});
		const messages = linter.verify(code, config, {filename});
		const result = linter.verifyAndFix(code, config, {filename});

		t.true(result.fixed);
		t.is(result.output, output);
		t.deepEqual(
			messages.map(({message, ruleId}) => ({message, ruleId})),
			Array.from({length: errors}, () => (
				{
					message: MESSAGE,
					ruleId: RULE_ID,
				}
			)),
		);
	});
}
