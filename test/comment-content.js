import test from 'ava';
import {Linter} from 'eslint';
import css from '@eslint/css';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import html from '@html-eslint/eslint-plugin';
import unicorn from '../index.js';
import {getTester} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

const MESSAGE_ID = 'comment-content';
const RULE_ID = 'unicorn/comment-content';
const LANGUAGE_PLUGINS = {
	css,
	html,
	json,
	markdown,
};

ruleTest.snapshot({
	valid: [
		'// Node.js uses JavaScript.',
		'// Stack Overflow, macOS, YouTube, GitHub, iOS, Reddit.',
		'// Gulp, Grunt, SVG, URL, CSS, HTML, PNG, JPG, JPEG.',
		'// npm, Bitcoin, DevOps, jQuery, TypeScript.',
		'// React, Vue.js, ESLint, Facebook, Discord, Twitch.',
		'// API, CLI, JSON, YAML, XML, DOM, JSX, AST, SQL, URI.',
		'// DNS, TCP, UDP, PDF, CSV, TSV, GIF, WebP, AVIF.',
		'// ASCII, Unicode, UTF-8, UUID, MIME, POSIX.',
		'// OAuth, GraphQL, WebSocket, WebRTC, WebGL.',
		'// Linux, Unix, Git, VS Code.',
		'// CPU, GPU, UI, UX, CORS, CSRF, XSS, JWT, TLS, SSL, SSH, FTP, SFTP, RAM.',
		'// AWS, GCP, Azure, Docker, Kubernetes, K8s, NGINX, S3, EC2, CI, CD.',
		'// MySQL, SQLite, PostgreSQL, MongoDB, Redis, Deno, Svelte, Vite.',
		'// CDN, SDK, IDE, LSP, WebAssembly, MDN, NFC, NFD, RTL, LTR, CRUD.',
		'// IIFE, ESM, CJS, UMD, BOM, EOF, EOL, stdin, stdout, stderr.',
		'// app apps applicationName applicationsName',
		'// https://github.com/sindresorhus/eslint-plugin-unicorn',
		'// See reactjs.org for docs.',
		'// See github.com for docs.',
		'// See github.co.uk for docs.',
		'// See github.ai for docs.',
		'// Send application/json.',
		'// Send image/svg+xml and text/html.',
		'// Should react to input.',
		'// `nodejs`',
		'// `api cli json yaml xml dom jsx ast sql uri dns tcp udp pdf csv tsv gif webp avif ascii unicode utf8 uuid mime posix oauth graphql websocket webrtc webgl linux unix git vscode`',
		'// `cpu gpu ui ux cors csrf xss jwt tls ssl ssh ftp sftp ram aws gcp azure docker kubernetes k8s nginx s3 ec2 ci cd mysql sqlite postgresql mongodb redis deno svelte vite`',
		'// `cdn sdk ide lsp wasm mdn nfc nfd rtl ltr crud iife esm cjs umd bom eof eol STDIN STDOUT STDERR`',
		'// Import from \'eslint\' and "@typescript-eslint/types".',
		`/**
		It's a type import.
		@param {import('eslint').Rule.RuleContext} context
		*/`,
		'// Use eslint-doc-generator and typescript-eslint.',
		'// See api.github.com and websocket.org.',
		'// See aws.amazon.com, vite.dev, redis.io, and mysql.com.',
		'// See cdn.example.com and mdn.dev.',
		'// Download from ftp://example.com/file and sftp://example.com/file.',
		'// Copy from s3://bucket/key.',
		'// React.js()',
		'const text = "nodejs";',
		'#!/usr/bin/env node\n// Node.js',
		'// eslint-disable-next-line no-console -- nodejs',
		'/* eslint no-console:"off" -- eslint directive */',
		{
			code: '// nodejs',
			options: [
				{
					replacements: {
						'\\bnode\\.?js\\b': false,
					},
				},
			],
		},
		{
			code: '// nodejs',
			options: [
				{
					extendDefaultReplacements: false,
					replacements: {},
				},
			],
		},
		{
			code: '// TO DO',
			options: [
				{
					extendDefaultReplacements: false,
					replacements: {
						'to do': {
							replacement: 'TODO',
							caseSensitive: true,
						},
					},
				},
			],
		},
	],
	invalid: [
		'// nodejs uses javascript.',
		'// Node.js and nodejs',
		'// NodeJS uses Javascript.',
		'// stackoverflow question',
		'// mac OS X and MacOS',
		'// you tube video',
		'// github issue',
		'// ios app',
		'// reddit discussion',
		'// gulp.js task',
		'// grunt.js task',
		'// svg url css html png jpg jpeg',
		'// NPM package',
		'// bitcoin devops JQuery IOS Typescript',
		'// React.js and reactjs',
		'// Vuejs and vue',
		'// eslint and eslint.js',
		'// FaceBook discord twitchtv',
		'// applications and application',
		'// nodejs (legacy)',
		'// github and `nodejs`',
		'// `nodejs` then github and `javascript`',
		`// api
		// cli
		// json
		// yaml
		// xml
		// dom
		// jsx
		// ast
		// sql
		// uri`,
		`// dns
		// tcp
		// udp
		// pdf
		// csv
		// tsv
		// gif
		// webp
		// avif`,
		`// ascii
		// unicode
		// utf8
		// utf-8
		// uuid
		// mime
		// posix`,
		`// oauth
		// graphql
		// websocket
		// webrtc
		// webgl
		// linux
		// unix
		// git
		// vscode
		// vs code`,
		`// cpu
		// gpu
		// ui
		// ux
		// cors
		// csrf
		// xss
		// jwt
		// tls
		// ssl
		// ssh
		// ftp
		// sftp
		// ram`,
		`// aws
		// gcp
		// azure
		// docker
		// kubernetes
		// k8s
		// nginx
		// s3
		// ec2
		// ci
		// cd`,
		`// mysql
		// sqlite
		// postgresql
		// mongodb
		// redis
		// deno
		// svelte
		// vite`,
		`// cdn
		// sdk
		// ide
		// lsp
		// wasm
		// webassembly
		// mdn
		// nfc
		// nfd
		// rtl
		// ltr
		// crud`,
		`// iife
		// esm
		// cjs
		// umd
		// bom
		// eof
		// eol
		// STDIN
		// STDOUT
		// STDERR`,
		'/* node.js */',
		`/**
		 * nodejs and javascript
		 */`,
	],
});

ruleTest({
	valid: [],
	invalid: [
		{
			code: '// teh value',
			output: '// the value',
			options: [
				{
					extendDefaultReplacements: false,
					replacements: {
						'\\bteh\\b': 'the',
					},
				},
			],
			errors: [
				{
					messageId: MESSAGE_ID,
					data: {
						value: 'teh',
						replacement: 'the',
					},
				},
			],
		},
		{
			code: '// to do',
			output: '// TODO',
			options: [
				{
					extendDefaultReplacements: false,
					replacements: {
						'to do': {
							replacement: 'TODO',
							caseSensitive: false,
						},
					},
				},
			],
			errors: 1,
		},
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
			[RULE_ID]: 'error',
		},
	};
}

const languageCases = [
	{
		name: 'CSS',
		filename: 'fixture.css',
		language: 'css/css',
		code: '/* nodejs */\n.selector {}',
		output: '/* Node.js */\n.selector {}',
		message: 'Prefer `Node.js` over `nodejs`.',
	},
	{
		name: 'JSONC',
		filename: 'fixture.jsonc',
		language: 'json/jsonc',
		code: '{\n\t// github\n\t"url": "nodejs"\n}',
		output: '{\n\t// GitHub\n\t"url": "nodejs"\n}',
		message: 'Prefer `GitHub` over `github`.',
	},
	{
		name: 'HTML',
		filename: 'fixture.html',
		language: 'html/html',
		code: '<!-- github --><div></div>',
		output: '<!-- GitHub --><div></div>',
		message: 'Prefer `GitHub` over `github`.',
	},
	{
		name: 'Markdown',
		filename: 'fixture.md',
		language: 'markdown/gfm',
		code: 'It\'s documented\n\n<!-- github -->\n\n# Title',
		output: 'It\'s documented\n\n<!-- GitHub -->\n\n# Title',
		message: 'Prefer `GitHub` over `github`.',
	},
];

for (const {name, code, output, language, filename, message} of languageCases) {
	test(`supports ${name}`, t => {
		const config = createLanguageConfig(language);
		const linter = new Linter({configType: 'flat'});
		const messages = linter.verify(code, config, {filename});
		const result = linter.verifyAndFix(code, config, {filename});

		t.true(result.fixed);
		t.is(result.output, output);
		t.deepEqual(
			messages.map(({message, ruleId}) => ({message, ruleId})),
			[
				{
					message,
					ruleId: RULE_ID,
				},
			],
		);
	});
}

test('ignores comment-like JSONC string content', t => {
	const config = createLanguageConfig('json/jsonc');
	const linter = new Linter({configType: 'flat'});
	const messages = linter.verify('{"comment": "// github"}', config, {filename: 'fixture.jsonc'});
	const result = linter.verifyAndFix('{"comment": "// github"}', config, {filename: 'fixture.jsonc'});

	t.false(result.fixed);
	t.is(result.output, '{"comment": "// github"}');
	t.deepEqual(messages, []);
});

test('ignores Markdown text that is not an HTML comment', t => {
	const config = createLanguageConfig('markdown/gfm');
	const linter = new Linter({configType: 'flat'});
	const code = '// github\n\n/* nodejs */';
	const messages = linter.verify(code, config, {filename: 'fixture.md'});
	const result = linter.verifyAndFix(code, config, {filename: 'fixture.md'});

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('ignores Markdown fenced code block content', t => {
	const config = createLanguageConfig('markdown/gfm');
	const linter = new Linter({configType: 'flat'});
	const code = '```html\n<!-- github -->\n```';
	const messages = linter.verify(code, config, {filename: 'fixture.md'});
	const result = linter.verifyAndFix(code, config, {filename: 'fixture.md'});

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('fixes multiple problems in the same comment over multiple passes', t => {
	const config = {
		files: ['**'],
		languageOptions: {
			sourceType: 'module',
		},
		plugins: {
			unicorn,
		},
		rules: {
			[RULE_ID]: 'error',
		},
	};
	const linter = new Linter({configType: 'flat'});
	const result = linter.verifyAndFix('// nodejs uses javascript.', config, {filename: 'fixture.js'});

	t.true(result.fixed);
	t.is(result.output, '// Node.js uses JavaScript.');
});

test('fixes slash-separated acronym pairs', t => {
	const config = {
		files: ['**'],
		languageOptions: {
			sourceType: 'module',
		},
		plugins: {
			unicorn,
		},
		rules: {
			[RULE_ID]: 'error',
		},
	};
	const linter = new Linter({configType: 'flat'});
	const result = linter.verifyAndFix('// ci/cd pipeline and ui/ux polish.', config, {filename: 'fixture.js'});

	t.true(result.fixed);
	t.is(result.output, '// CI/CD pipeline and UI/UX polish.');
});

test('reports one problem per comment', t => {
	const config = {
		files: ['**'],
		languageOptions: {
			sourceType: 'module',
		},
		plugins: {
			unicorn,
		},
		rules: {
			[RULE_ID]: 'error',
		},
	};
	const code = Array.from({length: 12}, () => '// nodejs').join('\n');
	const output = Array.from({length: 12}, () => '// Node.js').join('\n');
	const linter = new Linter({configType: 'flat'});
	const messages = linter.verify(code, config, {filename: 'fixture.js'});
	const result = linter.verifyAndFix(code, config, {filename: 'fixture.js'});

	t.is(messages.length, 12);
	t.true(result.fixed);
	t.is(result.output, output);
});
