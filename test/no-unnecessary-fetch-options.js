import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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
		'fetch(url)',
		'fetch(url, options)',
		'fetch(url, {}, extraArgument)',
		'new Request(url)',
		'new Request(url, options)',
		'new Request(url, {}, extraArgument)',
		'fetch(url, {method: "POST"})',
		'fetch(url, {method: "GET"})',
		'fetch(url, {method: "HEAD"})',
		'fetch(url, {method})',
		'fetch(url, {mode: "cors"})',
		'fetch(url, {mode: "same-origin"})',
		'fetch(url, {credentials: "include"})',
		'fetch(url, {cache: "reload"})',
		'fetch(url, {redirect: "manual"})',
		'fetch(url, {referrer: ""})',
		'fetch(url, {referrerPolicy: "no-referrer"})',
		'fetch(url, {integrity: "sha256-abc"})',
		'fetch(url, {keepalive: true})',
		'fetch(url, {headers: {"x-custom": "value"}})',
		'fetch(url, {headers: {}})',
		'fetch(url, {headers: new Headers([["x-custom", "value"]])})',
		'fetch(url, {headers})',
		'fetch(url, {body: ""})',
		'fetch(url, {priority: "auto"})',
		'fetch(url, {window: null})',
		'fetch(url, {duplex: "half"})',
		'fetch(url, {...options, method: "GET"})',
		'fetch(url, {[key]: value, method: "GET"})',
		'fetch(url, {method: "POST", method: "GET"})',
		'fetch(url, {method: "GET", method: "POST"})',
		'fetch(url, {method: "GET", ["method"]: "POST"})',
		'fetch(url, {[method]: "POST"})',
		'fetch(request, {method: "GET"})',
		'fetch(new Request(url, {method: "POST"}), {method: "GET"})',
		'fetch(request, {mode: "cors"})',
		'fetch(request, {headers: {}})',
		'new Request(request, {method: "GET"})',
		'new Request(url, {method: "GET"})',
		'new Request(url, {headers: {}})',
		'new Request(new Request(url, {method: "POST"}), {method: "GET"})',
		'new fetch(url, {})',
		'Request(url, {})',
		'notFetch(url, {})',
		'new NotRequest(url, {})',
		'const fetch = () => {}; fetch(url, {})',
		'const Request = class {}; new Request(url, {})',
		'const URL = class {}; fetch(new URL(url), {method: "GET"})',
		'const Headers = class {}; fetch("/", {headers: new Headers()})',
		typeAware('declare const request: Request; fetch(request, {method: "GET"});'),
		typeAware('declare const request: Request; new Request(request, {mode: "cors"});'),
		typeAware('declare const request: Request; fetch(request, {headers: {}});'),
		typeAware('declare const request: Request; new Request(request, {headers: []});'),
		typeAware('declare const input: Request | string; fetch(input, {method: "GET"});'),
	],
	invalid: [
		'fetch(url, {})',
		'fetch(url, {},)',
		'new Request(url, {})',
		'fetch("https://example.com", {method: "GET"})',
		'new Request("https://example.com", {method: "GET"})',
		'fetch(`https://example.com`, {method: "get"})',
		'fetch(new URL(url), {method: "Get"})',
		'const method = "GET"; fetch("/", {method})',
		'fetch("/", {method: `GET`})',
		'fetch("/", {"method": "GET"})',
		'fetch("/", {["method"]: "GET"})',
		'fetch("/", {method: "GET", "": value})',
		'fetch("/", {headers: {"x-custom": "value"}, method: "GET"})',
		'fetch("/", {method}); const method = "GET";',
		'fetch("/", {mode: "cors"})',
		'new Request("/", {credentials: "same-origin"})',
		'fetch("/", {credentials: "same-origin"})',
		'fetch("/", {cache: "default"})',
		'fetch("/", {redirect: "follow"})',
		'fetch("/", {referrer: "about:client"})',
		'fetch("/", {referrerPolicy: ""})',
		'fetch("/", {integrity: ""})',
		'fetch("/", {keepalive: false})',
		'fetch("/", {headers: {}})',
		'fetch("/", {headers: []})',
		'new Request("/", {headers: []})',
		'fetch("/", {headers: new Headers()})',
		'fetch(url, {method: undefined})',
		'const signal = undefined; fetch(url, {signal})',
		'fetch("/", {signal}); const signal = undefined;',
		'fetch(url, {headers: undefined})',
		'fetch(url, {signal: undefined})',
		'fetch(url, {duplex: undefined})',
		'fetch(url, {priority: undefined})',
		'fetch(url, {window: undefined})',
		'fetch(url, {body: null})',
		'fetch("/", {body: null},)',
		'new Request(url, {body: null})',
		'fetch(request, {method: undefined})',
		'fetch(request, {body: null})',
		'fetch("/", {method: "GET"}, extraArgument)',
		'fetch(url, /* keep */ {})',
		'fetch(url, {/* keep */})',
		'fetch(url, {}, /* keep */)',
		'fetch("/", {method: "GET"} /* keep */)',
		outdent`
			fetch('/', {
				method: 'GET',
				headers: {
					accept: 'application/json',
				},
			});
		`,
		outdent`
			fetch('/', {
				method: 'GET',
				credentials: 'same-origin',
			});
		`,
		outdent`
			fetch('/', {
				// Keep this comment.
				method: 'GET',
			});
		`,
		outdent`
			fetch('/', {
				method: /* keep */ 'GET',
			});
		`,
		outdent`
			fetch('/', {
				method: 'GET', // Keep this comment.
				headers: {
					accept: 'application/json',
				},
			});
		`,
		'fetch("/", {method: (sideEffect(), "GET")})',
		'fetch(url, {method: void sideEffect()})',
		'fetch(url, {body: (sideEffect(), null)})',
		'fetch("/", {[(sideEffect(), "method")]: "GET"})',
		typeAware('declare const url: string; fetch(url, {method: "GET"});'),
		typeAware('declare const url: string; new Request(url, {method: "GET"});'),
		typeAware('declare const url: URL; fetch(url, {headers: {}});'),
		typeAware('declare const url: string | URL; fetch(url, {method: "GET"});'),
	],
});

test({
	valid: [],
	invalid: [
		{
			code: outdent`
				fetch('/', {
					method: 'GET',
					credentials: 'same-origin',
				});
			`,
			output: 'fetch(\'/\');',
			errors: 2,
		},
		{
			code: outdent`
				new Request('/', {
					method: 'GET',
					credentials: 'same-origin',
				});
			`,
			output: 'new Request(\'/\');',
			errors: 2,
		},
		{
			code: 'fetch("/", {method, credentials: "same-origin"}); const method = "GET";',
			output: 'fetch("/", {method}); const method = "GET";',
			errors: 2,
		},
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'fetch(url, {method: "POST" as const})',
		'fetch(url, {method: (method satisfies string)})',
	],
	invalid: [
		'fetch("/", {method: ("GET" as const)})',
		'fetch("/", {method: (<const>"GET")})',
		'fetch("/", {method: ("GET" satisfies string)})',
		'fetch("/", {method: ("GET"!)})',
		'fetch("/", {body: (null as null)})',
		'fetch("/", ({} as const))',
		'new Request("/", ({} as const))',
		'fetch("/", ({method: "GET"} as const))',
		'fetch("/", ({method: "GET"} satisfies RequestInit))',
	],
});
