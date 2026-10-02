import test from 'ava';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test: testRule} = getTester(import.meta);
const withUrl = code => `const url = new URL('https://example.com'); ${code}`;
const typescript = code => ({code, languageOptions: {parser: parsers.typescript}});
const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

testRule({
	valid: [],
	invalid: [{
		code: withUrl('url.protocol === \'https\''),
		output: withUrl('url.protocol === \'https:\''),
		errors: [{messageId: 'no-invalid-url-protocol-comparison'}],
	}],
});

testRule.snapshot({
	valid: [
		...[
			'url.protocol === "https:"',
			'url.protocol !== "http:"',
			'url.protocol = "https"',
			'url.protocol = "HTTPS"',
			'url.protocol.startsWith("http")',
			'url.protocol.includes("http")',
			'"https:".includes(url.protocol)',
			'url.protocol === ""',
			'url.protocol === "https://"',
			'url.protocol === " https"',
			String.raw`url.protocol === "https\n"`,
			'url.protocol === "https::"',
			'url.protocol === "1http"',
			'url.protocol === "web_demo"',
			'url.protocol === "hKtp"',
			'url.protocol === value',
			'const scheme = "https"; url.protocol === scheme',
			'url.protocol === `http${suffix}`', // eslint-disable-line no-template-curly-in-string
			'url.protocol === tag`https`',
			'url.protocol < "https"',
			'url.hostname === "https"',
			'url[property] === "https"',
			'switch (url.protocol) {case "https:": break; default: break;}',
			'switch (value) {case "https": break;}',
			'["http:", "https:"].includes(url.protocol)',
			'const protocols = ["https"]; protocols.includes(url.protocol)',
			'const protocols = new Set(["https"]); protocols.has(url.protocol)',
			'new Set(["https:"]).has(url.protocol)',
			'["https"].includes(value)',
			'["https"].includes(...values)',
			'["https"].includes(url.protocol, 0, extra)',
			'new Set(["https"]).has(url.protocol, extra)',
			'new Set(["https"], extra).has(url.protocol)',
			'const {protocol} = url; protocol === "https"',
			'url.protocol.slice(0, -1) === "https"',
		].map(code => withUrl(code)),
		'url.protocol === "https"',
		'const url = {protocol: "https"}; url.protocol === "https"',
		'const url = createUrl(); url.protocol === "https"',
		'let url = new URL(value); url.protocol === "https"',
		'const URL = class {}; new URL(value).protocol === "https"',
		'url.protocol === "https"; const url = new URL(value)',
		'const url = new URLSearchParams(); url.protocol === "https"',
		'const url = new CustomURL(value); url.protocol === "https"',
		'const {href: url} = new URL(value); url.protocol === "https"',
		typescript('function example(url: {protocol: string}) {return url.protocol === "https";}'),
		typescript('function example(url: URL | string) {return url.protocol === "https";}'),
		typescript('function example(url: URL | undefined) {return url?.protocol === "https";}'),
		typescript('type URL = {protocol: string}; function example(url: URL) {return url.protocol === "https";}'),
		typescript('class URL {protocol = "https";} new URL().protocol === "https"'),
		typescript('function example<T extends URL>(url: T) {return url.protocol === "https";}'),
	],
	invalid: [
		...['==', '===', '!=', '!=='].flatMap(operator => [
			withUrl(`url.protocol ${operator} "https"`),
			withUrl(`"HTTPS:" ${operator} url.protocol`),
		]),
		...['http', 'ftp', 'file', 'ws', 'wss', 'mailto', 'data', 'blob', 'web+demo', 'x-v1.2', 'a', 'HTTPS', 'HtTp:'].map(protocol => withUrl(`url.protocol === "${protocol}"`)),
		...[
			'url["protocol"] === "https"',
			'url[`protocol`] === "https"',
			'(url).protocol === ("https")',
			'url?.protocol === "https"',
			'url?.["protocol"] === "https"',
			'!(url.protocol === "https")',
			'url.protocol === "http" || url.protocol === "https"',
			'url.protocol === `https`',
			String.raw`url.protocol === "h\u0074tps"`,
			String.raw`url.protocol === "\x48TTPS:"`,
			'url.protocol /* keep */ === /* keep */ "https"',
			'switch (url.protocol) {case "http": break; case "HTTPS": break; default: break;}',
			'switch (url?.protocol) {case `https`: break;}',
			'switch (url["protocol"]) {case /* keep */ "https": break;}',
			'["http", "https"].includes(url.protocol)',
			'!["http", "HTTPS:"].includes(url.protocol)',
			'["http:", "https", value, ...values, , "FTP"].includes(url.protocol)',
			'["https"].includes(url.protocol, start())',
			'["https"].indexOf(url.protocol)',
			'["https"].indexOf(url.protocol, 1) !== -1',
			'["https"].lastIndexOf(url.protocol, -1) >= 0',
			'["https"].includes(url?.protocol)',
			'["https"]?.includes?.(url.protocol)',
			'(["https"]).includes(url.protocol)',
			'new Set(["http", "HTTPS:"]).has(url.protocol)',
			'new Set(["https", value, ...values]).has(url.protocol)',
			'new Set([/* keep */ "https"]).has(/* keep */ url.protocol)',
			'new Set(["https"])?.has?.(url?.protocol)',
			'consume(url.protocol === "https")',
		].map(code => withUrl(code)),
		'new URL(value).protocol === "https"',
		'import {URL} from "node:url"; new URL(value).protocol === "https"',
		'import {URL as NodeURL} from "url"; const url = new NodeURL(value); url.protocol === "https"',
		'const url = new URL(value); const alias = url; alias.protocol === "https"',
		'(condition ? new URL(value) : new URL(other)).protocol === "https"',
		'(sideEffect(), new URL(value)).protocol === "https"',
		typescript('function example(url: URL) {return url.protocol === "https";}'),
		typescript('type Url = URL; function example(url: Url) {return url.protocol === "https";}'),
		typescript('import type {URL as NodeURL} from "node:url"; function example(url: NodeURL) {return url.protocol === "https";}'),
		typescript('declare const url: import("url").URL; url.protocol === "https"'),
		typescript('(value as URL).protocol === ("HTTPS" as const)'),
		typescript('(<URL>value).protocol === "https"'),
		typescript('const url = new URL(value); url!.protocol === "https"'),
		typescript('const url = new URL(value); url["protocol" as const] === "https"'),
		typescript('const url = new URL(value); url["protocol" satisfies string] === "https"'),
		typescript('const url = new URL(value); (url.protocol satisfies string) === "https"'),
		typescript('const url = new URL(value); (url satisfies URL).protocol === "https"'),
		typescript('const url = new URL(value); (["https"] as const).includes(url.protocol)'),
		typescript('const url = new URL(value); (new Set(["https"]) as Set<string>).has(url.protocol)'),
		typescript('function example(url: URL) {switch (url.protocol) {case ("HTTPS" as const): break;}}'),
		{code: withUrl('<div>{url.protocol === "https"}</div>'), languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
		'const url = new URL(value);\r\nif (url.protocol === "https") {\r\n  consume(url);\r\n}',
	],
});

testRule({
	valid: [],
	invalid: [
		{code: withUrl('switch (url.protocol) {case "https": break; case "https:": break;}'), errors: 1},
		{code: withUrl('switch (url.protocol) {case "HTTPS": break; case "https": break;}'), errors: 2},
		{code: withUrl('switch (url.protocol) {case "HTTPS:": break; case "https:": break;}'), errors: 1},
		{
			...typescript(withUrl('switch (url.protocol) {case "HTTPS": break; case (`https:` as const): break; case "FTP": break;}')),
			output: withUrl('switch (url.protocol) {case "HTTPS": break; case (`https:` as const): break; case "ftp:": break;}'),
			errors: 2,
		},
	],
});

testRule({
	valid: [
		typescript('type Url = URL; { const url: Url = {protocol: "https"}; url.protocol === "https"; type Url = {protocol: string}; }'),
		typeAware('type Url = URL; { function example(url: Url) { return url.protocol === "https"; } type Url = {protocol: string}; }'),
		typeAware('import type {URL as Url} from "node:url"; { declare const object: {url: Url}; object.url.protocol === "https"; type Url = {protocol: string}; }'),
	],
	invalid: [{
		...typescript('function example(url: Url) { return url.protocol === "https"; } type Url = URL;'),
		output: 'function example(url: Url) { return url.protocol === "https:"; } type Url = URL;',
		errors: [{messageId: 'no-invalid-url-protocol-comparison'}],
	}],
});

testRule.snapshot({
	valid: [
		typeAware('declare const value: unknown; value.protocol === "https"'),
		typeAware('import {URL} from "node:url"; namespace Other {export class URL {protocol = "https";}} declare function getUrl(): Other.URL; getUrl().protocol === "https";'),
		typeAware('type URL = {protocol: string}; declare function getUrl(): URL; getUrl().protocol === "https"'),
		typeAware('declare const url: URL | {protocol: string}; url.protocol === "https"'),
		typeAware('class CustomURL extends URL {protocol = "https";} new CustomURL(value).protocol === "https"'),
	],
	invalid: [
		typeAware('declare const object: {url: URL}; object.url.protocol === "https"'),
		typeAware('declare function getUrl(): URL; getUrl().protocol === "https"'),
		typeAware('declare function getObject(): {url: URL}; ["HTTPS:"].includes(getObject().url.protocol)'),
	],
});

testRule({
	valid: [],
	invalid: [
		{
			...typeAware('const {url} = {url: new URL("https://example.com")}; url.protocol === "https";'),
			output: 'const {url} = {url: new URL("https://example.com")}; url.protocol === "https:";',
			errors: [{messageId: 'no-invalid-url-protocol-comparison'}],
		},
		{
			...typescript('function example(url: URL) { type URL = {protocol: string}; return url.protocol === "https"; }'),
			output: 'function example(url: URL) { type URL = {protocol: string}; return url.protocol === "https:"; }',
			errors: [{messageId: 'no-invalid-url-protocol-comparison'}],
		},
		{
			...typeAware('function example(url: URL) { class URL {protocol = "https";} return url.protocol === "https"; }'),
			output: 'function example(url: URL) { class URL {protocol = "https";} return url.protocol === "https:"; }',
			errors: [{messageId: 'no-invalid-url-protocol-comparison'}],
		},
		{
			...typescript('function getUrl(): URL { type URL = {protocol: string}; return undefined!; } getUrl().protocol === "https";'),
			output: 'function getUrl(): URL { type URL = {protocol: string}; return undefined!; } getUrl().protocol === "https:";',
			errors: [{messageId: 'no-invalid-url-protocol-comparison'}],
		},
	],
});

testRule({
	valid: [
		typescript('function example(url: URL | string) {if (url instanceof URL) {return url.protocol === "https";}}'),
		typeAware('function example(url: URL | {protocol: string}) {if (url instanceof URL) {url = {protocol: "https"}; return url.protocol === "https";}}'),
		typeAware('type URL = {protocol: string}; function example(url: URL | string) {if (typeof url !== "string") {return url.protocol === "https";}}'),
		typeAware('class CustomURL {protocol = "https";} function example(url: URL | CustomURL) {if (url instanceof CustomURL) {return url.protocol === "https";}}'),
	],
	invalid: [
		{
			...typeAware('function example(url: URL | {protocol: string}) {url.protocol === "https"; if (url instanceof URL) {return url.protocol === "https";} return url.protocol === "https";}'),
			output: 'function example(url: URL | {protocol: string}) {url.protocol === "https"; if (url instanceof URL) {return url.protocol === "https:";} return url.protocol === "https";}',
			errors: [{messageId: 'no-invalid-url-protocol-comparison'}],
		},
		{
			...typeAware('declare function getUrl(): URL | {protocol: string}; const url = getUrl(); if (url instanceof URL) {url.protocol === "https";} url.protocol === "https";'),
			output: 'declare function getUrl(): URL | {protocol: string}; const url = getUrl(); if (url instanceof URL) {url.protocol === "https:";} url.protocol === "https";',
			errors: [{messageId: 'no-invalid-url-protocol-comparison'}],
		},
		{
			...typeAware('function example(url: URL | string) {if (typeof url === "string") {return;} return url.protocol === "https";}'),
			output: 'function example(url: URL | string) {if (typeof url === "string") {return;} return url.protocol === "https:";}',
			errors: [{messageId: 'no-invalid-url-protocol-comparison'}],
		},
	],
});

testRule({
	valid: [typescript, typeAware].flatMap(parse => [
		parse('declare const url: any; (url satisfies URL).protocol === "https";'),
		parse('const url = {protocol: "https"}; (url satisfies {protocol: string}).protocol === "https";'),
	]),
	invalid: [typescript, typeAware].flatMap(parse => [
		{
			...parse('(new URL("https://example.com") satisfies unknown).protocol === "https";'),
			output: '(new URL("https://example.com") satisfies unknown).protocol === "https:";',
			errors: [{messageId: 'no-invalid-url-protocol-comparison'}],
		},
		{
			...parse('const url = new URL("https://example.com"); (url satisfies {protocol: string}).protocol === "https";'),
			output: 'const url = new URL("https://example.com"); (url satisfies {protocol: string}).protocol === "https:";',
			errors: [{messageId: 'no-invalid-url-protocol-comparison'}],
		},
	]),
});

testRule({
	valid: [],
	invalid: [parsers.vue, parsers.svelte].map(parser => ({
		code: '<script>const url = new URL("https://example.com"); url.protocol === "https";</script>',
		output: '<script>const url = new URL("https://example.com"); url.protocol === "https:";</script>',
		languageOptions: {parser},
		errors: [{messageId: 'no-invalid-url-protocol-comparison'}],
	})),
});

test('fixes converge with prefer-includes', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: plugin},
		rules: {
			'unicorn/no-invalid-url-protocol-comparison': 'error',
			'unicorn/prefer-includes': 'error',
		},
	};
	const result = linter.verifyAndFix(withUrl('["http", "HTTPS:"].indexOf(url.protocol) !== -1'), config);
	t.is(result.output, withUrl('["http:", "https:"].includes(url.protocol)'));
	t.deepEqual(result.messages, []);
	t.false(linter.verifyAndFix(result.output, config).fixed);
});
