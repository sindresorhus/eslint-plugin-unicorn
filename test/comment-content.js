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
const JAVASCRIPT_CONFIG = {
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

function verifyJavaScript(code) {
	const linter = new Linter({configType: 'flat'});

	return linter.verify(code, JAVASCRIPT_CONFIG, {filename: 'fixture.js'});
}

function verifyAndFixJavaScript(code) {
	const linter = new Linter({configType: 'flat'});

	return linter.verifyAndFix(code, JAVASCRIPT_CONFIG, {filename: 'fixture.js'});
}

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
		'// ``nodejs``',
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
		'// import api from \'../github-helpers/api.js\';',
		// A term preceded by a hyphen (compound word fragment) is skipped
		'// foo-github-bar',
		'// The file is api.js.',
		'// Use api/index.js.',
		'// Use api/config.json.',
		'// Use api/[id].json.',
		'// Use api/(group)/config.json.',
		'// Use api/{id}/config.json.',
		'// Use src/api/index.js.',
		'// Use src/json/data.json.',
		'// Use foo_api.',
		String.raw`// Use C:\tools\api\config.json.`,
		'// Run scripts/node.js.',
		'// Use .svg files.',
		'// React.js()',
		'const text = "nodejs";',
		'#!/usr/bin/env node\n// Node.js',
		'// eslint-disable-next-line no-console -- nodejs',
		'/* eslint no-console:"off" -- eslint directive */',
		// Commented-out multi-line code spanning several line comments (#3387).
		`// const value = sanitize(
		//   html,
		//   allowed
		// )`,
		// The same construct inside a single block comment.
		`/*
		const value = sanitize(
			html,
			allowed
		)
		*/`,
		// Nested brackets in a commented-out block keep continuation lines masked.
		`// const result = transform({
		//   html: readFile(),
		//   json: [parse(api)],
		// })`,
		// Commented-out multi-line code in a JSDoc block keeps its continuation lines masked.
		`/**
		 * const value = sanitize(
		 *   html,
		 *   allowed
		 * )
		 */`,
		// An unbalanced open bracket in a block comment masks the rest of the construct.
		`/*
		const value = sanitize(
			html,
			allowed
		*/`,
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
		// Same term as a dotted property (skipped) and as standalone prose (flagged)
		'// foo.github and github docs',
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
		// Prose ending in a comma must still be corrected (a prose line does not open bracket depth).
		`// We sanitize the input,
		// then return html.`,
		// A balanced code line does not leak depth into the following prose line.
		`// const x = parse(html)
		// Then read the html.`,
		// A blank line breaks the commented-out block so trailing prose is still corrected.
		`// const value = sanitize(

		// then return html.`,
		// An ESLint directive between commented-out code lines resets the continuation so later prose is corrected.
		`// const value = sanitize(
		// eslint-disable-next-line no-console
		// then return html.`,
		// Real code between two line comments breaks the commented-out block so trailing prose is corrected.
		`// const value = sanitize(
		doSomething();
		// then return html.`,
		// After a commented-out block closes its brackets, prose before the next block is still corrected.
		`// const a = open(
		//   data
		// )
		// then read the html.
		// const b = close(
		//   data
		// )`,
	],
});

// With `checkUniformCase: false`, only tokens that already mix upper- and lower-case are re-cased.
ruleTest.snapshot({
	valid: [
		// All-lowercase tokens are left alone, including the cases from #3253.
		'// @eslint/json',
		'// Run @svgr/webpack for .svg imports',
		'// the url of the page',
		'// returns json data',
		// All-uppercase tokens are left alone.
		'// JSON, URL, API parsing',
		// Tokens with digits are uniform-case too, so they are left alone even though the canonical form has a digit (`EC2`).
		'// deploy to ec2',
		// The matched token decides, not the replacement, so an all-lowercase token stays even when its replacement is mixed-case (`iOS`).
		'// build for ios',
		// A mixed-case token inside code is still protected by masking.
		'// Use src/Json/index.js.',
	].map(code => ({code, options: [{checkUniformCase: false}]})),
	invalid: [
		// Tokens that already mix upper- and lower-case are still corrected.
		'// the Url of the page',
		'// use Json here',
		'// install Github cli',
		'// run on Nodejs',
		'// see Stack overflow',
		// Letter-changing replacements still apply to uniform-case tokens.
		'// the application starts',
	].map(code => ({code, options: [{checkUniformCase: false}]})),
});

ruleTest({
	valid: [
		{
			// `to do` → `TODO` only changes case and whitespace (same letters), so `checkUniformCase: false` leaves the all-lowercase form alone.
			code: '// to do',
			options: [
				{
					checkUniformCase: false,
					extendDefaultReplacements: false,
					replacements: {
						'to do': {
							replacement: 'TODO',
							caseSensitive: false,
						},
					},
				},
			],
		},
	],
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
		{
			// A letter-changing replacement still applies to an all-lowercase token when `checkUniformCase` is `false`.
			code: '// teh value',
			output: '// the value',
			options: [
				{
					checkUniformCase: false,
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

test('does not repeatedly rescan Markdown fences for HTML comments', t => {
	const config = createLanguageConfig('markdown/gfm');
	const linter = new Linter({configType: 'flat'});
	const code = '<!-- api -->\n'.repeat(10_000);
	const result = linter.verifyAndFix(code, config, {filename: 'fixture.md'});

	t.true(result.fixed);
	t.false(result.output.includes('api'));
});

test('ignores many Markdown HTML comments inside fenced code blocks', t => {
	const config = createLanguageConfig('markdown/gfm');
	const linter = new Linter({configType: 'flat'});
	const fencedComments = '<!-- api -->\n'.repeat(10_000);
	const code = `\`\`\`html
${fencedComments}\`\`\`
<!-- json -->`;
	const result = linter.verifyAndFix(code, config, {filename: 'fixture.md'});

	t.true(result.fixed);
	t.true(result.output.includes(fencedComments));
	t.true(result.output.endsWith('<!-- JSON -->'));
});

test('does not repeatedly scan nested Markdown HTML comment starts', t => {
	const config = createLanguageConfig('markdown/gfm');
	const linter = new Linter({configType: 'flat'});
	const nestedCommentStarts = '<!-- nested\n'.repeat(2000);
	const code = `<!--
${nestedCommentStarts}-->
<!-- json -->`;
	const result = linter.verifyAndFix(code, config, {filename: 'fixture.md'});

	t.true(result.fixed);
	t.is(result.output, `<!--
${nestedCommentStarts}-->
<!-- JSON -->`);
});

test('fixes multiple problems in the same comment over multiple passes', t => {
	const result = verifyAndFixJavaScript('// nodejs uses javascript.');

	t.true(result.fixed);
	t.is(result.output, '// Node.js uses JavaScript.');
});

test('ignores custom replacement matches that overlap masked regions', t => {
	const linter = new Linter({configType: 'flat'});
	const code = '// `json` api';
	const config = {
		...JAVASCRIPT_CONFIG,
		rules: {
			[RULE_ID]: [
				'error',
				{
					extendDefaultReplacements: false,
					replacements: {
						'.*api\\b': 'API',
					},
				},
			],
		},
	};
	const messages = linter.verify(code, config, {filename: 'fixture.js'});
	const result = linter.verifyAndFix(code, config, {filename: 'fixture.js'});

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('ignores unterminated quoted strings', t => {
	const code = '// "json';
	const messages = verifyJavaScript(code);
	const result = verifyAndFixJavaScript(code);

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('ignores double-quoted strings after identifiers', t => {
	const result = verifyAndFixJavaScript('// foo"json" output');

	t.false(result.fixed);
	t.is(result.output, '// foo"json" output');
});

test('ignores unterminated double quotes after identifiers', t => {
	const code = '// foo"json output';
	const messages = verifyJavaScript(code);
	const result = verifyAndFixJavaScript(code);

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('ignores unterminated inline code', t => {
	const code = '// `json output';
	const messages = verifyJavaScript(code);
	const result = verifyAndFixJavaScript(code);

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('continues checking prose after quoted backticks', t => {
	const result = verifyAndFixJavaScript('// "`api" and json output.');

	t.true(result.fixed);
	t.is(result.output, '// "`api" and JSON output.');
});

test('fixes slash-separated acronym pairs', t => {
	const result = verifyAndFixJavaScript(`// ci/cd pipeline and ui/ux polish.
// ci/cd.
// ui/ux.
// json/xml formats.
// api/css docs.
// http/https support.
// css/html docs.
// svg/png output.
// json/yaml files.
// tcp/udp sockets.`);

	t.true(result.fixed);
	t.is(result.output, `// CI/CD pipeline and UI/UX polish.
// CI/CD.
// UI/UX.
// JSON/XML formats.
// API/CSS docs.
// HTTP/HTTPS support.
// CSS/HTML docs.
// SVG/PNG output.
// JSON/YAML files.
// TCP/UDP sockets.`);
});

test('fixes prose comments', t => {
	const result = verifyAndFixJavaScript('// the api returns json and svg files.');

	t.true(result.fixed);
	t.is(result.output, '// the API returns JSON and SVG files.');
});

test('fixes prose on lines that mention code-like text', t => {
	const code = `// Use the api for optional chaining, like foo?.bar.
// Use api. json output follows.
// api: json is the response format.
// See [api] docs.
// api [docs](https://example.com) returns json.
// api [docs](https://example.com)
// api [docs](example.com)
// Use foo.bar() and json output.
// api [deprecated] endpoint.
// api [deprecated] (old) uses json.
// api [deprecated]. uses json.
// api [deprecated]
// api [json]
// docs: api [json]
// for api users, json responses are common.
// if api access fails, return json.`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `// Use the API for optional chaining, like foo?.bar.
// Use API. JSON output follows.
// API: JSON is the response format.
// See [API] docs.
// API [docs](https://example.com) returns JSON.
// API [docs](https://example.com)
// API [docs](example.com)
// Use foo.bar() and JSON output.
// API [deprecated] endpoint.
// API [deprecated] (old) uses JSON.
// API [deprecated]. uses JSON.
// API [deprecated]
// API [JSON]
// docs: API [JSON]
// for API users, JSON responses are common.
// if API access fails, return JSON.`);
});

test('ignores code-like lines in comments', t => {
	const code = `/*
These will throw RefinedGitHubApiError.

Usage:

import api from '../github-helpers/api.js';
api?.v3()
api?.v3
api?.[json]()
api.v3?.(json)
api['v3']()
api ['v3']()
api .v3()
api .v3
api. v3
api. json
api . v3
api . json
docs: api .v3
api [json].value
api [json][key]
api [json]()
docs: api [json].value
json['parse'](value)
- api.v3(json)
1. api.v3(json)
(api.v3(json))
value = api.v3(json)
if (api) return json
for (const api of values) return json
else if (api) return json
const user = await api.v3(\`/users/\${username}\`);
const repositoryCommits = await api.v3('commits');
const data = await api.v4('{user(login: "user") {name}}');
api.v3(json) [docs](https://example.com)
*/`;
	const messages = verifyJavaScript(code);
	const result = verifyAndFixJavaScript(code);

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('ignores standalone computed calls with spaced bracket access', t => {
	const code = `// api [json]()
// api [json](value)
// api [json] (value)
// api [docs](readme)
// api [docs](docs)
// API [json]()
// API [json](value)
// Api [json](value)
// Client [json](value)
// docs: API [json]()
// docs: API [json](value)
// value = api [json](value)
// (api [json](value))
// - api [json]()
// - api [json](value)
// 1. api [json]()
// 1. api [json](value)`;
	const messages = verifyJavaScript(code);
	const result = verifyAndFixJavaScript(code);

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('ignores package specifiers without skipping slash-pair prose', t => {
	const code = `// Install @scope/api and foo/json?raw.
// Use foo/json#raw and foo/json@beta.
// Use foo/api.
// Use eslint/css.
// Use api/json.
// ci/cd pipeline and ui/ux polish.`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `// Install @scope/api and foo/json?raw.
// Use foo/json#raw and foo/json@beta.
// Use foo/api.
// Use eslint/css.
// Use API/JSON.
// CI/CD pipeline and UI/UX polish.`);
});

test('does not repeatedly scan long slash-delimited package-like tokens', t => {
	const code = `// ${'api/'.repeat(20_000)}api`;
	const result = verifyAndFixJavaScript(code);

	t.false(result.fixed);
	t.is(result.output, code);
});

test('does not repeatedly scan malformed slash-delimited tokens', t => {
	const code = `// ${'api//'.repeat(20_000)}json`;
	const result = verifyAndFixJavaScript(code);

	t.false(result.fixed);
	t.is(result.output, code);
});

test('ignores compact structured data snippets', t => {
	const code = `// api: json
// - api: json
// + api: json
// 1. api: json
// api: json # comment
// api: https://example.com/json
// {api: json}
// - {api: json}
// {api: {json: true}}
// api: { nested: { json: true } }
// api: json is prose.`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `// api: json
// - api: json
// + api: json
// 1. api: json
// api: json # comment
// api: https://example.com/json
// {api: json}
// - {api: json}
// {api: {json: true}}
// api: { nested: { json: true } }
// API: JSON is prose.`);
});

test('ignores prompt-prefixed command-line snippets', t => {
	const code = `// $ nodejs --version
// $ nodejs --version.
// > node json
// > nodejs --version
// > nodejs --version.
// - $ nodejs --version
// + $ nodejs --version
// 1. $ nodejs --version
// npm install json
// npm update json
// git log json
// npm install json is easy.
// npm install json is easy
// git status shows json.
// git status shows json
// > nodej json
// $50 api plan returns json.
// nodejs output uses json.`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `// $ nodejs --version
// $ nodejs --version.
// > node json
// > nodejs --version
// > nodejs --version.
// - $ nodejs --version
// + $ nodejs --version
// 1. $ nodejs --version
// npm install JSON
// npm update JSON
// Git log JSON
// npm install JSON is easy.
// npm install JSON is easy
// Git status shows JSON.
// Git status shows JSON
// > nodej JSON
// $50 API plan returns JSON.
// Node.js output uses JSON.`);
});

test('ignores Markdown reference and chained link labels', t => {
	const code = `// [api]: https://example.com/json
// [json][api]
// [api docs][json]
// See ([api][json]) and nodejs.
// See [api][reference] and json output.
// See [api](https://example.com/json) and nodejs.
// See [api](https://example.com/json "json title") and json output.
// See [api][json][nodejs] and javascript.
// [api]: https://example.com/json (json title)
// [api]: https://example.com and json output.
// See [api] docs.
// api [docs](./setup)
// api [docs](/setup)
// api [docs](#setup)
// api [docs](../setup)
// api [docs](docs/setup)`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `// [api]: https://example.com/json
// [json][api]
// [api docs][json]
// See ([api][json]) and Node.js.
// See [api][reference] and JSON output.
// See [api](https://example.com/json) and Node.js.
// See [api](https://example.com/json "json title") and JSON output.
// See [api][json][nodejs] and JavaScript.
// [api]: https://example.com/json (json title)
// [api]: https://example.com and JSON output.
// See [API] docs.
// API [docs](./setup)
// API [docs](/setup)
// API [docs](#setup)
// API [docs](../setup)
// API [docs](docs/setup)`);
});

test('does not treat multiline text as a Markdown link destination', t => {
	const code = `/*
See [api](
The json response.
)
*/`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `/*
See [API](
The JSON response.
)
*/`);
});

test('does not treat multiline text as a Markdown reference destination', t => {
	const code = `/*
[api]:
json output.
*/`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `/*
[API]:
JSON output.
*/`);
});

test('does not mask Markdown links that start inside quoted strings or inline code', t => {
	const code = `// " [api](x" json output )
// \` [api](x\` json output )`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `// " [api](x" JSON output )
// \` [api](x\` JSON output )`);
});

test('does not mask malformed Markdown inline link destinations', t => {
	const code = '// See [api](x json output).';
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, '// See [API](x JSON output).');
});

test('does not repeatedly scan malformed Markdown inline-link starts', t => {
	const code = `/*
${'[docs](x'.repeat(50_000)}
json output.
*/`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `/*
${'[docs](x'.repeat(50_000)}
JSON output.
*/`);
});

test('does not repeatedly scan malformed Markdown labels', t => {
	const code = `/*
${' [docs'.repeat(50_000)}
json output.
*/`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `/*
${' [docs'.repeat(50_000)}
JSON output.
*/`);
});

test('does not repeatedly scan repeated domain-like text', t => {
	const code = `/*
${'example.'.repeat(50_000)}com
json output.
*/`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `/*
${'example.'.repeat(50_000)}com
JSON output.
*/`);
});

test('ignores markup tag regions', t => {
	const code = `// <api json="true">
// Use <api> and json output.
// x < y and <api json="true">`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `// <api json="true">
// Use <api> and JSON output.
// x < y and <api json="true">`);
});

test('does not treat multiline text as a markup tag', t => {
	const code = `/*
<api
The json response.
>
*/`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `/*
<API
The JSON response.
>
*/`);
});

test('does not repeatedly scan multiline non-tags', t => {
	const code = `/*
${'<a'.repeat(50_000)}
> json output.
*/`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `/*
${'<a'.repeat(50_000)}
> JSON output.
*/`);
});

test('does not mask markup tags that start inside quoted strings', t => {
	const result = verifyAndFixJavaScript('// " <api " json output >');

	t.true(result.fixed);
	t.is(result.output, '// " <api " JSON output >');
});

test('fixes prose inside braces', t => {
	const result = verifyAndFixJavaScript('// {api json prose}');

	t.true(result.fixed);
	t.is(result.output, '// {API JSON prose}');
});

test('ignores fenced code blocks in block comments', t => {
	const code = `/*
\`\`\`js
nodejs --version
\`\`\`
*/`;
	const messages = verifyJavaScript(code);
	const result = verifyAndFixJavaScript(code);

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('continues checking prose after fenced code blocks with unmatched delimiters', t => {
	const code = `/*
~~~js
\`api
"json
~~~
The json output.
*/`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `/*
~~~js
\`api
"json
~~~
The JSON output.
*/`);
});

test('continues checking prose after fenced code blocks with unmatched brackets', t => {
	const code = `/*
~~~js
console.log(
~~~
The json output.
*/`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `/*
~~~js
console.log(
~~~
The JSON output.
*/`);
});

test('ignores indented fenced code blocks in block comments', t => {
	const code = `function foo() {
	/*
	~~~sh
	nodejs --version
	~~~
	*/
}`;
	const messages = verifyJavaScript(code);
	const result = verifyAndFixJavaScript(code);

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('ignores fenced code blocks in JSDoc comments', t => {
	const code = `function foo() {
	/**
	 * ~~~sh
	 * nodejs --version
	 * ~~~
	 */
}`;
	const messages = verifyJavaScript(code);
	const result = verifyAndFixJavaScript(code);

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('ignores JSDoc example sections', t => {
	const code = `/**
Do something.

@example
nodejs --version

@returns json output
*/`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `/**
Do something.

@example
nodejs --version

@returns JSON output
*/`);
});

test('continues checking prose after JSDoc examples with unmatched delimiters', t => {
	const code = `/**
Do something.

@example
\`api
"json

@returns json output
*/`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `/**
Do something.

@example
\`api
"json

@returns JSON output
*/`);
});

test('continues checking prose after JSDoc examples with unmatched brackets', t => {
	const code = `/**
Do something.

@example
console.log(

@returns json output
*/`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `/**
Do something.

@example
console.log(

@returns JSON output
*/`);
});

test('continues checking prose around skipped code in the same block comment', t => {
	const code = `/*
The api returns json.
const data = await api.v3('commits');
*/`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `/*
The API returns JSON.
const data = await api.v3('commits');
*/`);
});

test('ignores commented-out multi-line bare calls', t => {
	const code = `// sanitize(
//   html,
//   allowed
// )`;
	const messages = verifyJavaScript(code);
	const result = verifyAndFixJavaScript(code);

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('ignores commented-out multi-line bare calls with spaced call parentheses', t => {
	const code = `// sanitize (
//   html,
//   allowed
// )`;
	const messages = verifyJavaScript(code);
	const result = verifyAndFixJavaScript(code);

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('ignores commented-out multi-line member calls', t => {
	const code = `// api.v3(
//   html,
//   json
// )`;
	const messages = verifyJavaScript(code);
	const result = verifyAndFixJavaScript(code);

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('ignores commented-out multi-line constructor calls', t => {
	const code = `// new Set([
//   json,
// ])`;
	const messages = verifyJavaScript(code);
	const result = verifyAndFixJavaScript(code);

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('ignores commented-out multi-line simple assignments', t => {
	const code = `// value = sanitize(
//   html,
//   allowed
// )`;
	const messages = verifyJavaScript(code);
	const result = verifyAndFixJavaScript(code);

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('ignores commented-out multi-line member assignments', t => {
	const code = `// module.exports = sanitize(
//   html,
//   allowed
// )`;
	const messages = verifyJavaScript(code);
	const result = verifyAndFixJavaScript(code);

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('checks prose parentheticals spanning line comments', t => {
	const code = `// Note (api users
// should read json docs)`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `// Note (API users
// should read JSON docs)`);
});

test('continues checking prose after skipped regex code', t => {
	const code = `// const pattern = /(/;
// The html output uses json.
// const otherPattern = /(/
// The api output uses xml.`;
	const result = verifyAndFixJavaScript(code);

	t.true(result.fixed);
	t.is(result.output, `// const pattern = /(/;
// The HTML output uses JSON.
// const otherPattern = /(/
// The API output uses XML.`);
});

test('ignores brackets inside nested comments in commented-out multi-line code', t => {
	const code = `// const result = transform(
//   // )
//   json,
// )
// const other = transform(
//   /* ) */
//   api,
// )`;
	const messages = verifyJavaScript(code);
	const result = verifyAndFixJavaScript(code);

	t.false(result.fixed);
	t.is(result.output, code);
	t.deepEqual(messages, []);
});

test('reports one problem per comment', t => {
	const code = Array.from({length: 12}, () => '// nodejs').join('\n');
	const output = Array.from({length: 12}, () => '// Node.js').join('\n');
	const messages = verifyJavaScript(code);
	const result = verifyAndFixJavaScript(code);

	t.is(messages.length, 12);
	t.true(result.fixed);
	t.is(result.output, output);
});
