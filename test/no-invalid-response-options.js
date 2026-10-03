/* eslint-disable no-template-curly-in-string */
import test from 'node:test';
import {Linter} from 'eslint';
import plugin from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: testRule} = getTester(import.meta);
const constructors = ['new Response', 'Response.json'];
const invalidStatuses = ['0', '101', '103', '199', '600', '65_536', '-1', 'NaN', 'Infinity', '-Infinity', 'null', 'false', 'true', '"invalid"'];

testRule.snapshot({
	valid: [
		'new Response()',
		'new Response("")',
		'new Response("", {})',
		'Response.json(data)',
		'Response.json(data, {})',
		'Response.redirect(url)',
		'Response.redirect(url, undefined)',
		'Response.redirect(url, void sideEffect())',
		...constructors.flatMap(constructor => [200, 299, 300, 404, 599, 599.9, 65_736].map(status => `${constructor}("", {status: ${status}})`)),
		...[301, 302, 303, 307, 308, 302.9, 65_838].map(status => `Response.redirect(url, ${status})`),
		'Response.redirect(url, "302")',
		'const status = +302; Response.redirect(url, status)',
		'new Response(undefined, {status: -65_336})',
		...constructors.flatMap(constructor => [
			`${constructor}("", {status: undefined})`,
			`${constructor}("", {status: void 0})`,
			`${constructor}("", {status: "200"})`,
			`${constructor}("", {status})`,
			`${constructor}("", options)`,
			`${constructor}("", {status: {valueOf() { return 204; }}})`,
			`${constructor}("", {status: 204n})`,
			`${constructor}("", {status: Symbol()})`,
			`${constructor}("", {status: 204, status: 200})`,
			`${constructor}("", {status: 204, ...options})`,
			`${constructor}("", {status: 204, [key]: 200})`,
			`${constructor}("", {get status() { return 204; }})`,
			`${constructor}("", {status: 204, set status(value) {}})`,
			`${constructor}("", {status() { return 204; }})`,
			`${constructor}("", {status: 204, get status() { return 200; }})`,
			`${constructor}("", {...{status: 204}})`,
		]),
		...[204, 205, 304].flatMap(status => ['undefined', 'null', 'void sideEffect()'].map(body => `new Response(${body}, {status: ${status}})`)),
		'const body = null; new Response(body, {status: 204})',
		'const body = undefined; new Response(body, {status: 204})',
		'new Response(body, {status: 204})',
		'new Response(getBody(), {status: 204})',
		'new Response(condition ? null : "", {status: 204})',
		'new Response(JSON.stringify(data), {status: 204})',
		'let status = 204; status = 200; new Response("", {status})',
		'let status = 200; status = 204; Response.json(data, {status})',
		'const options = {status: 204}; options.status = 200; new Response("", options)',
		'const object = {status: 204}; object.status = 200; new Response("", {status: object.status})',
		'new Response("", {status: (sideEffect(), 204)})',
		'const alias = condition; var condition = true; new Response("", {status: alias ? 204 : 200})',
		// Constant initializers are unknown before their declarations.
		'new Response("", {status}); const status = 204;',
		'new Response(body, {status: 204}); const body = "";',
		'new Response("", {[key]: 204}); const key = "status";',
		'new Response("", {status: 204, [key]: 200}); const key = "headers";',
		'let body = ""; body = null; new Response(body, {status: 204})',
		'const status = getStatus(); Response.redirect(url, status)',
		'Response.redirect(url, status)',
		'Response.redirect(url, {})',
		'Response.redirect(url, 200n)',
		'Response.redirect(url, Symbol())',
		'Response("", {status: 204})',
		'new OtherResponse("", {status: 204})',
		'new globalThis.Response("", {status: 204})',
		'OtherResponse.json(data, {status: 204})',
		'globalThis.Response.json(data, {status: 204})',
		'new Response.json(data, {status: 204})',
		'Response.json?.(data, {status: 204})',
		'Response?.json(data, {status: 204})',
		'Response["json"](data, {status: 204})',
		'Response.redirect?.(url, 200)',
		'Response?.redirect(url, 200)',
		'Response["redirect"](url, 200)',
		'new Response(...bodies, {status: 204})',
		'new Response("", ...options)',
		'Response.json(...data, {status: 204})',
		'Response.json(data, ...options)',
		'Response.redirect(...urls, 200)',
		'Response.redirect(url, ...statuses)',
		// Validation of other fields and URLs belongs outside this rule.
		String.raw`new Response("", {statusText: "\n"})`,
		'Response.json(data, {headers: {"invalid header": "value"}})',
		'Response.redirect("http://:", 302)',
		// Compound expressions and constant aliases are intentionally not evaluated.
		'new Response(true ? "" : null, {status: 204})',
		'const condition = true; Response.json(data, {status: condition ? 204 : 200})',
		'const originalStatus = 204; const status = originalStatus; new Response("", {status})',
		'const object = {}; mutate(object); new Response(true ? `${object}` : "", {status: 204})',
		'const object = {}; mutate(object); new Response((`${object}`, "body"), {status: 204})',
		'const object = {}; Object.defineProperty(object, "valueOf", {value() { return 302; }}); Response.redirect(url, +object)',
		'const object = {}; Object.defineProperty(object, "toString", {value() { return "302"; }}); Response.redirect(url, `${object}`)',
		'const object = {}; Object.defineProperty(object, "valueOf", {value() { return 302; }}); const status = +object; Response.redirect(url, status)',
		'const object = {}; Object.defineProperty(object, "valueOf", {value() { return 1; }}); new Response(+object ? null : "", {status: 204})',
		'const object = {}; Object.defineProperty(object, "toString", {value() { return "status"; }}); new Response("", {status: 204, [`${object}`]: 200})',
		'const status = undefined; new Response("", {status})',
	],
	invalid: [
		...[204, 205, 304].flatMap(status => [
			`new Response("", {status: ${status}})`,
			`Response.json(data, {status: ${status}})`,
		]),
		'Response.json(null, {status: 304})',
		'Response.json(undefined, {status: 204})',
		...['"body"', 'false', '0', '[]', '{}', 'new Uint8Array()', 'new Blob([])', '`body ${value}`', '[sideEffect()]', '{value: object.value}'].map(body => `new Response(${body}, {status: 204})`),
		'const body = ""; new Response(body, {status: 204})',
		'new Response("", {status: "204"})',
		'new Response("", {status: 204.9})',
		'new Response("", {status: +204})',
		'new Response("", {status: 65_740})',
		'const status = 205; new Response("", {status})',
		'const status = 304; Response.json(data, {status})',
		'const status = 200; Response.redirect(url, status)',
		...constructors.flatMap(constructor => invalidStatuses.map(status => `${constructor}(undefined, {status: ${status}})`)),
		...[200, 300, 304, 305, 306, 309, 600].map(status => `Response.redirect(url, ${status})`),
		'Response.redirect(url, null)',
		'Response.redirect(url, false)',
		'Response.redirect(url, NaN)',
		'Response.redirect(url, "200")',
		'const key = "status"; new Response("", {[key]: 204})',
		'new Response("", {[`status`]: 204})',
		'new Response("", {status: 204, [0]: 200})',
		...constructors.flatMap(constructor => [
			`${constructor}("", {status: 200, status: 204})`,
			`${constructor}("", {get status() { return 200; }, status: 204})`,
			`${constructor}("", {...options, status: 204})`,
			`${constructor}("", {[key]: 200, status: 204})`,
			`${constructor}("", {"status": 204})`,
			`${constructor}("", {["status"]: 204})`,
			`${constructor}("", {status: 204, headers: {}})`,
			`${constructor}("", {status: 204}, ...extraArguments)`,
		]),
		'Response.redirect(url, 200, ...extraArguments)',
		'new ((Response))((("")), (({status: 204})))',
		'Response.json(data, {status: 304}).clone()',
		'consume(new Response("", {status: 204}))',
		'new Response(/* before */ "" /* after */, {status: 204})',
		'new Response({/* keep */}, {status: 204})',
		'new Response(`body ${object.value}`, {status: 204})',
		'new Response(`body ${sideEffect()}`, {status: 204})',
	],
});

testRule.snapshot({
	valid: [
		'new Response(null as BodyInit | null, {status: 204} as ResponseInit)',
		'new Response(undefined!, {status: 204})',
		'new Response(body as string, {status: 204})',
		'Response.json(data, {status: (200 as number)} satisfies ResponseInit)',
		'const status = +(302 as number); Response.redirect(url, status)',
		'const object = {}; Object.defineProperty(object, "toString", {value() { return "302"; }}); Response.redirect(url, `${object as string}`)',
	].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	invalid: [
		'new Response("" as string, {status: 204} as ResponseInit)',
		'new Response(<string>"", <ResponseInit>{status: <number>204})',
		'new Response("" satisfies string, {status: 204} satisfies ResponseInit)',
		'new Response(""!, {status: 204}!)',
		'new Response(("" as string)!, {status: (204 as number)!})',
		'new Response("" as /* keep */ string, {status: 204})',
		'Response.json(data, {status: 304} as ResponseInit)',
		'Response.redirect(url, 200 as number)',
		'Response.json(data, {["status" as string]: 304})',
		'new Response("", {status: +(204 as number)})',
		'Response.json(data, {status: -(1 as number)})',
		'Response.redirect(url, `${200 as number}`)',
		'const status = +(204 satisfies number); new Response("", {status})',
		'Response.redirect(url, -(Infinity as number))',
	].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
});

testRule.snapshot({
	valid: [],
	invalid: [
		{
			code: '<Component response={new Response("", {status: 204})} />',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
	],
});

testRule({
	valid: [],
	invalid: [
		{
			code: 'new Response("", {status: 204});',
			errors: [{
				messageId: 'body-with-null-body-status',
				suggestions: [{messageId: 'remove-body', output: 'new Response(undefined, {status: 204});'}],
			}],
		},
		{
			code: 'new Response(`body ${1}`, {status: 204});',
			errors: [{
				messageId: 'body-with-null-body-status',
				suggestions: [{messageId: 'remove-body', output: 'new Response(undefined, {status: 204});'}],
			}],
		},
		{
			code: 'new Response(1n, {status: 204});',
			errors: [{
				messageId: 'body-with-null-body-status',
				suggestions: [{messageId: 'remove-body', output: 'new Response(undefined, {status: 204});'}],
			}],
		},
		{
			code: 'new Response(/body/, {status: 204});',
			errors: [{messageId: 'body-with-null-body-status', suggestions: []}],
		},
		{
			code: 'const object = {}; Object.defineProperty(object, "toString", {get() { sideEffect(); return String; }}); new Response(`${object}`, {status: 204})',
			errors: [{messageId: 'body-with-null-body-status', suggestions: []}],
		},
		...[
			'{}',
			'[]',
			'new Blob([])',
			'[sideEffect()]',
			'{value: object.value}',
			'`body ${object}`',
			'{} as /* keep */ BodyInit',
			'{toString() { sideEffect(); return "body"; }}',
			'{get toString() { sideEffect(); return String; }}',
			'[object]',
		].map(body => ({
			code: `new Response(${body}, {status: 204})`,
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'body-with-null-body-status', suggestions: []}],
		})),
	],
});

test('works with related rules after Response.json autofixing', t => {
	const linter = new Linter();
	const result = linter.verifyAndFix('new Response(JSON.stringify(data), {status: 204})', {
		plugins: {unicorn: plugin},
		rules: {
			'unicorn/no-invalid-response-options': 'error',
			'unicorn/prefer-response-static-json': 'error',
			'unicorn/no-invalid-fetch-options': 'error',
			'unicorn/no-unnecessary-fetch-options': 'error',
			'unicorn/no-invalid-argument-count': 'error',
			'unicorn/no-null': 'error',
		},
	});
	t.assert.strictEqual(result.output, 'Response.json(data, {status: 204})');
	t.assert.strictEqual(result.messages.length, 1);
	t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/no-invalid-response-options');
	t.assert.strictEqual(result.messages[0].messageId, 'body-with-null-body-status');
});
