/* eslint-disable no-template-curly-in-string */
import {runInNewContext} from 'node:vm';
import test from 'ava';
import {Linter} from 'eslint';
import {typescriptEslintParser} from '../scripts/parsers.js';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);
const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

ruleTest.snapshot({
	valid: [
		'new URLSearchParams()',
		'new URLSearchParams("")',
		'new URLSearchParams("query=hello")',
		'new URLSearchParams("?query=hello")',
		'new URLSearchParams("redirect=https://example.com/?query=hello")',
		'new URLSearchParams({redirect: "https://example.com/"})',
		'new URLSearchParams([["query", "hello"]])',
		'new URLSearchParams(parameters)',
		'new URLSearchParams(url.search)',
		'new URLSearchParams(url.searchParams)',
		'new URLSearchParams(location.search)',
		'new URLSearchParams(url.href)',
		'new URLSearchParams({href: "?query=hello"}.href)',
		'new URLSearchParams({href: "https://example.com/"}.href)',
		'new URLSearchParams(getInput())',
		'new URLSearchParams(`https://example.com/?query=${query}`)',
		'new URLSearchParams("mailto:user@example.com?query=hello")',
		'new URLSearchParams("data:text/plain,hello?query=hello")',
		'new URLSearchParams("https:example.com/?query=hello")',
		'new URLSearchParams("//example.com/?query=hello")',
		'new URLSearchParams("/path?query=hello")',
		'new URLSearchParams("https://[invalid/?query=hello")',
		'new URLSearchParams(...["https://example.com/"])',
		'new URLSearchParams("https://example.com/", extra)',
		'URLSearchParams("https://example.com/")',
		'new OtherParams("https://example.com/")',
		'new globalThis.URLSearchParams("https://example.com/")',
		'const Params = URLSearchParams; new Params("https://example.com/")',
		'let input = "https://example.com/"; new URLSearchParams(input)',
		'new URLSearchParams(input); const input = "https://example.com/"',
		'let url = new URL(input); new URLSearchParams(url.href)',
		'class Address extends URL {} const url = new Address(input); new URLSearchParams(url.href)',
		'const url = new URL(input); new URLSearchParams(url["href"])',
		'const url = new URL(input); new URLSearchParams(url?.href)',
		'new URLSearchParams(window?.location.href)',
		'new URLSearchParams(window["location"].href)',
		'const href = new URL(input).href; new URLSearchParams(href)',
	],
	invalid: [
		...[
			'https://example.com/?query=hello',
			'http://example.com/?query=hello',
			'HTTPS://example.com/?query=hello',
			'file:///path?query=hello',
			'custom+scheme://host/path?query=hello',
			'https://example.com/',
			'https://example.com/?',
			'https://example.com/?query=hello&query=again#fragment',
			'https://example.com/?query=a%2Bb+c&empty=',
			' https://example.com/?query=hello ',
		].map(input => `new URLSearchParams(${JSON.stringify(input)})`),
		'new URLSearchParams(`https://example.com/?query=hello`)',
		'new URLSearchParams("https://" + "example.com/?query=hello")',
		'new URLSearchParams({input: "https://example.com/"}["input"])',
		'new URLSearchParams({href: "https://example.com/"}?.href)',
		'const input = "https://example.com/"; new URLSearchParams(input)',
		'const input = "https://example.com/"; const alias = input; new URLSearchParams(alias)',
		'new URLSearchParams((("https://example.com/")),)',
		'new URLSearchParams("https://example.com/").get("query")',
		{
			code: 'const view = <div>{new URLSearchParams("https://example.com/").get("query")}</div>',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		'new URLSearchParams(/* keep */ "https://example.com/")',
		'new URLSearchParams(new URL(input).href)',
		'new URLSearchParams(new URL("mailto:user@example.com?query=hello").href)',
		'const url = new URL(input, base); new URLSearchParams(url.href)',
		'const url = new URL(input); const alias = url; new URLSearchParams(alias.href)',
		'new URLSearchParams((new URL(input)).href)',
		'new URLSearchParams(((new URL(input).href)),)',
		'const url = new URL(input); new URLSearchParams(/* keep */ url.href)',
		'const url = new URL(input); new URLSearchParams(url /* keep */ .href)',
		'new URLSearchParams(new URL(/* keep */ input).href)',
		'new URLSearchParams((condition ? new URL(first) : new URL(second)).href)',
		'const url = new URL(input); new URLSearchParams((before(), url).href)',
		'const value = foo\nnew URLSearchParams((condition ? new URL(first) : new URL(second)).href)',
		...['location', 'window.location', 'globalThis.location', 'document.location', 'self.location'].map(receiver => `new URLSearchParams(${receiver}.href)`),
		'new URLSearchParams(/* keep */ window.location.href)',
		'new URLSearchParams(\r\n  "https://example.com/",\r\n)',
		'const url = new URL(input);\nconst parameters = new URLSearchParams(\n  url.href,\n);',
	],
});

ruleTest.snapshot({
	testerOptions: {languageOptions: {parser: typescriptEslintParser}},
	valid: [
		'function read(url: {href: string}) { return new URLSearchParams(url.href); }',
		'function read(url: URL | string) { return new URLSearchParams(url.href); }',
		'function read(url: URL | undefined) { return new URLSearchParams(url?.href); }',
		'function read(url: unknown) { return new URLSearchParams(url.href); }',
	],
	invalid: [
		'function read(url: URL) { return new URLSearchParams(url.href); }',
		'type Address = URL; function read(url: Address) { return new URLSearchParams(url.href); }',
		'import type {URL as Address} from "node:url"; function read(url: Address) { return new URLSearchParams(url.href); }',
		'new URLSearchParams(("https://example.com/" as string))',
		'new URLSearchParams(<string>"https://example.com/")',
		'new URLSearchParams((new URL(input) as URL).href)',
		'new URLSearchParams((new URL(input) satisfies URL).href)',
		'const url = new URL(input); new URLSearchParams(url!.href)',
		'const url = new URL(input); new URLSearchParams(url.href as string)',
	],
});

ruleTest.snapshot({
	valid: [typeAware('declare const holder: {url: {href: string}}; new URLSearchParams(holder.url.href)')],
	invalid: [
		typeAware('declare const holder: {url: URL}; new URLSearchParams(holder.url.href)'),
		typeAware('let url = new URL("https://example.com/"); new URLSearchParams(url.href)'),
	],
});

ruleTest.snapshot({
	valid: [
		'new URLSearchParams(new URLSearchParams("query=hello"))',
		'const url = new URL(input); new URLSearchParams(url.searchParams)',
		'let url = new URL(input); new URLSearchParams(url)',
		'class Address extends URL {} new URLSearchParams(new Address(input))',
		'new URLSearchParams(...[new URL(input)])',
		'new URLSearchParams(new URL(input), extra)',
	],
	invalid: [
		'new URLSearchParams(new URL(input))',
		'const url = new URL(input, base); new URLSearchParams(url)',
		'const url = new URL(input); const alias = url; new URLSearchParams(alias)',
		'new URLSearchParams(((new URL(input))),)',
		'new URLSearchParams(condition ? new URL(first) : new URL(second))',
		'new URLSearchParams((before(), new URL(input)))',
		'const value = foo\nnew URLSearchParams(condition ? new URL(first) : new URL(second))',
		'new URLSearchParams(new URL(input)).get("query")',
		'new URLSearchParams(/* keep */ new URL(input))',
		'new URLSearchParams(new URL(/* keep */ input))',
	],
});

ruleTest.snapshot({
	testerOptions: {languageOptions: {parser: typescriptEslintParser}},
	valid: [
		'function read(value: URLSearchParams) { return new URLSearchParams(value); }',
		'function read(value: URL | string) { return new URLSearchParams(value); }',
	],
	invalid: [
		'function read(url: URL) { return new URLSearchParams(url); }',
		'import type {URL as Address} from "node:url"; function read(url: Address) { return new URLSearchParams(url); }',
		'new URLSearchParams(new URL(input) as URL)',
		'new URLSearchParams(<URL>new URL(input))',
		'new URLSearchParams(new URL(input) satisfies URL)',
		'const url = new URL(input); new URLSearchParams(url!)',
	],
});

ruleTest.snapshot({
	valid: [typeAware('declare const holder: {parameters: URLSearchParams}; new URLSearchParams(holder.parameters)')],
	invalid: [
		typeAware('declare const holder: {url: URL}; new URLSearchParams(holder.url)'),
		typeAware('let url = new URL("https://example.com/"); new URLSearchParams(url)'),
		typeAware('declare const holder: {href: URL}; new URLSearchParams(holder.href)'),
	],
});

test('URL object suggestions extract queries and distinguish detached copies from live parameters', t => {
	const linter = new Linter();
	const config = {plugins: {unicorn: plugin}, rules: {'unicorn/no-url-in-search-params': 'error'}};
	const prefix = 'const url = new URL(input); ';
	const code = `${prefix}new URLSearchParams(url)`;
	const [problem] = linter.verify(code, config);
	t.is(problem?.suggestions?.length, 2);
	const url = new URL('https://example.com/?query=hello&query=again#fragment');
	t.deepEqual([...new URLSearchParams(url)], []);
	const [detached, live] = problem.suggestions.map(({fix}) => {
		const corrected = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		return runInNewContext(corrected.slice(prefix.length), {url, URLSearchParams});
	});
	t.deepEqual([...detached], [['query', 'hello'], ['query', 'again']]);
	t.deepEqual([...live], [...detached]);
	detached.set('query', 'detached');
	t.is(url.searchParams.get('query'), 'hello');
	live.set('query', 'live');
	t.is(url.searchParams.get('query'), 'live');
});

test('suggestions extract queries and distinguish detached copies from live parameters', t => {
	const linter = new Linter();
	const config = {plugins: {unicorn: plugin}, rules: {'unicorn/no-url-in-search-params': 'error'}};
	const prefix = 'const url = new URL(input); ';
	const code = `${prefix}new URLSearchParams(url.href)`;
	const [problem] = linter.verify(code, config);
	t.is(problem?.suggestions?.length, 2);
	const input = 'https://example.com/?query=hello&query=again#fragment';
	const url = new URL(input);
	t.deepEqual([...new URLSearchParams(input)], [['https://example.com/?query', 'hello'], ['query', 'again#fragment']]);
	const [detached, live] = problem.suggestions.map(({fix}) => {
		const corrected = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		return runInNewContext(corrected.slice(prefix.length), {url, URLSearchParams});
	});
	t.deepEqual([...detached], [['query', 'hello'], ['query', 'again']]);
	t.deepEqual([...live], [...detached]);
	detached.set('query', 'detached');
	t.is(url.searchParams.get('query'), 'hello');
	live.set('query', 'live');
	t.is(url.searchParams.get('query'), 'live');
	url.search = '?query=updated';
	t.is(live.get('query'), 'updated');
	t.is(detached.get('query'), 'detached');
});

for (const [input, expected] of [
	['https://example.com/?query=a%2Bb+c&query=again&empty=#fragment', [['query', 'a+b c'], ['query', 'again'], ['empty', '']]],
	['https://example.com/#?query=hello', []],
]) {
	test(`the URL-string suggestion extracts only query parameters: ${input}`, t => {
		const linter = new Linter();
		const config = {plugins: {unicorn: plugin}, rules: {'unicorn/no-url-in-search-params': 'error'}};
		const code = `new URLSearchParams(${JSON.stringify(input)})`;
		const [problem] = linter.verify(code, config);
		t.is(problem?.suggestions?.length, 1);
		const {fix} = problem.suggestions[0];
		const corrected = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		const parameters = runInNewContext(corrected, {URL});
		t.deepEqual([...parameters], expected);
	});
}

for (const argument of ['new URL(getInput()).href', 'new URL(getInput())']) {
	test(`URL receiver suggestions evaluate the input once: ${argument}`, t => {
		const linter = new Linter();
		const config = {plugins: {unicorn: plugin}, rules: {'unicorn/no-url-in-search-params': 'error'}};
		const code = `new URLSearchParams(${argument})`;
		const [problem] = linter.verify(code, config);
		t.is(problem?.suggestions?.length, 2);
		for (const {fix} of problem.suggestions) {
			let calls = 0;
			const corrected = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
			const parameters = runInNewContext(corrected, {
				URL,
				URLSearchParams,
				getInput() {
					calls++;
					return 'https://example.com/?query=hello#fragment';
				},
			});
			t.is(calls, 1);
			t.is(parameters.get('query'), 'hello');
		}
	});
}

test('URL preference rules complement the diagnostic', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: plugin},
		rules: {
			'unicorn/no-url-in-search-params': 'error',
			'unicorn/prefer-url-href': 'error',
			'unicorn/prefer-url-search-parameters': 'error',
		},
	};
	const href = linter.verifyAndFix('new URLSearchParams(new URL(input).toString())', config);
	t.is(href.output, 'new URLSearchParams(new URL(input).href)');
	t.deepEqual(href.messages.map(({ruleId}) => ruleId), ['unicorn/no-url-in-search-params']);
	const original = 'new URLSearchParams("https://example.com/".split("&").map(part => part.split("=")))';
	const [manual] = linter.verify(original, config);
	t.is(manual.ruleId, 'unicorn/prefer-url-search-parameters');
	const {fix} = manual.suggestions[0];
	const corrected = original.slice(0, fix.range[0]) + fix.text + original.slice(fix.range[1]);
	t.deepEqual(linter.verify(corrected, config).map(({ruleId}) => ruleId), ['unicorn/no-url-in-search-params']);
});
