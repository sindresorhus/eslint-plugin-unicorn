import {outdent} from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typescript = code => ({
	code,
	languageOptions: {
		parser: parsers.typescript,
	},
});

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		'url.href',
		'new URL("https://example.com").href',
		'String(value)',
		'value.toString()',
		'new URLSearchParams().toString()',
		'new NotURL(value).toString()',
		'const url = createURL(); url.toString()',
		'let url = new URL(value); url.toString()',
		'const URL = class {}; new URL(value).toString()',
		'const String = value => value.href; String(new URL(value))',
		'const URL = class {}; String(new URL(value))',
		'url?.toString()',
		'url.toString?.()',
		'url["toString"]()',
		'String(new URL(value), extra)',
		'const url = new URL(value); other.toString()',
		typescript('function foo(url: URL | string) { return url.toString(); }'),
		typescript('class URL { toString() { return ""; } } function foo(url: URL) { return url.toString(); }'),
		typescript('type URL = {href: string; toString(): string}; function foo(url: URL) { return String(url); }'),
		typescript('let url: URL; type URL = {href: string; toString(): string}; String(url);'),
		typescript('let url: URL; class URL { toString() { return ""; } } String(url);'),
		typescript('function foo<T extends URL>(url: T) { return String(url); }'),
		typescript('type Url = string; const url: Url = "x"; { type Url = URL; String(url); }'),
		typescript('type Url = string; function foo(url: Url) { type Url = URL; String(url); }'),
		typescript('import type {URL} from "node:url"; const URL = class { toString() { return ""; } }; new URL(value).toString();'),
		typescript('import {URL} from "node:url"; { const URL = class { toString() { return ""; } }; new URL(value).toString(); }'),
	],
	invalid: [
		'new URL(value).toString()',
		'(new URL(value)).toString()',
		'String(new URL(value))',
		'String((new URL(value)))',
		'const url = new URL(value); url.toString()',
		'const url = new URL(value); String(url)',
		'const url = new URL(value); const url2 = url; url2.toString()',
		'const url = condition ? new URL(a) : new URL(b); String(url)',
		'const url = new URL(value); url.toString = () => "custom"; url.toString()',
		'const url = new URL(value); url.toString = () => "custom"; String(url)',
		'import {URL} from "node:url"; new URL(value).toString()',
		'import {URL as NodeURL} from "url"; String(new NodeURL(value))',
		'import {URL as NodeURL} from "node:url"; const url = new NodeURL(value); String(url)',
		'fetch(new URL(value).toString())',
		'const url = new URL(value); fetch(url.toString())',
		'(new URL(value).toString)()',
		'const url = new URL(value); (url.toString)()',
		typescript('function foo(url: URL) { return url.toString(); }'),
		typescript('function foo(url: URL) { return String(url); }'),
		typescript('function foo(url: URL) { url.toString = () => "custom"; return String(url); }'),
		typescript('let url: URL = new URL(value); url.toString = () => "custom"; url.toString();'),
		typescript('type Url = URL; function foo(url: Url) { return url.toString(); }'),
		typescript('import type {URL} from "node:url"; function foo(url: URL) { return String(url); }'),
		typescript('String(new URL(value) as URL)'),
		typescript('(new URL(value) as URL).toString()'),
		typescript('String(foo satisfies URL)'),
		typescript('const url = foo as URL; String(url)'),
		typescript('type Url = URL; const url: Url = new URL(value); { type Url = string; String(url); }'),
		typescript('type Url = URL; function foo(url: Url) { type Url = string; String(url); }'),
		outdent`
			const foo = 1
			String((new URL(value)))
		`,
		'new URL(/* comment */ value).toString()',
		'String(/* comment */ new URL(value))',
		'const url = new URL(value); url.toString(/* comment */)',
	],
});

test.snapshot({
	valid: [
		typeAware('declare function getValue(): {href: string; toString(): string}; String(getValue());'),
		typeAware('type URL = {href: string; toString(): string}; declare const url: URL; url.toString();'),
		typeAware('declare const url: URL | string; String(url);'),
		typeAware('declare const value: unknown; String(value);'),
		typeAware('class CustomURL extends URL { toString() { return "custom"; } } const url = new CustomURL("https://example.com"); String(url);'),
		typeAware('declare const url: URL & {toString(): "custom"}; url.toString();'),
		typeAware('type URL = {href: string; toString(): string}; declare function getUrl(): URL; String(getUrl());'),
		typeAware('let url: URL; type URL = {href: string; toString(): string}; String(url);'),
		typeAware('let url: URL; class URL { toString() { return ""; } } String(url);'),
		typeAware('function foo<T extends URL>(url: T) { return String(url); }'),
		typeAware(outdent`
			import {URL as NodeURL} from 'node:url';
			namespace Other {
				export class URL {
					toString() {
						return 'custom';
					}
				}
			}
			declare function getUrl(): Other.URL;
			String(getUrl());
		`),
	],
	invalid: [
		typeAware('declare function getUrl(): URL; String(getUrl());'),
		typeAware('declare function getUrl(): URL; getUrl().toString();'),
		typeAware('import {URL} from "node:url"; declare function getUrl(): URL; String(getUrl());'),
		typeAware('import {URL as NodeURL} from "url"; declare function getUrl(): NodeURL; getUrl().toString();'),
		typeAware('import {URL} from "node:url"; declare function getUrl(): URL & URL; String(getUrl());'),
	],
});
