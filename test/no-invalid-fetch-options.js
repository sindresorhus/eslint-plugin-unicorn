import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'fetch(url, {method: "POST", body})',
		'new Request(url, {method: "POST", body})',
		'fetch(url, {})',
		'new Request(url, {})',
		'fetch(url)',
		'new Request(url)',
		'fetch(url, {method: "UNKNOWN", body})',
		'new Request(url, {method: "UNKNOWN", body})',
		'fetch(url, {body: undefined})',
		'new Request(url, {body: undefined})',
		'fetch(url, {body: null})',
		'new Request(url, {body: null})',
		// `void` always evaluates to `undefined`, so the body is effectively absent
		'fetch(url, {body: void 0})',
		'new Request(url, {method: "GET", body: void 0})',
		'fetch(url, {...options, body})',
		'new Request(url, {...options, body})',
		'new fetch(url, {body})',
		'Request(url, {body})',
		'not_fetch(url, {body})',
		'new not_Request(url, {body})',
		'fetch({body}, url)',
		'new Request({body}, url)',
		'fetch(url, {[body]: "foo=bar"})',
		'new Request(url, {[body]: "foo=bar"})',
		outdent`
			fetch(url, {
				body: 'foo=bar',
				body: undefined,
			});
		`,
		outdent`
			new Request(url, {
				body: 'foo=bar',
				body: undefined,
			});
		`,
		outdent`
			fetch(url, {
				method: 'HEAD',
				body: 'foo=bar',
				method: 'post',
			});
		`,
		outdent`
			new Request(url, {
				method: 'HEAD',
				body: 'foo=bar',
				method: 'post',
			});
		`,
		outdent`
			const modes = new Set(['foo']);
			modes.clear();
			fetch(url, {method: modes.size ? 'GET' : 'POST', body});
		`,
		'const alias = condition; var condition = true; fetch(url, {method: alias ? "GET" : "POST", body});',
		'const alias = condition; var condition = true; fetch(url, {method: (0, alias ? "GET" : "POST"), body});',
		'const modes = new Set(["foo"]); modes.clear(); fetch(url, {method: modes.size && "GET", body});',
		'const modes = new Set(["foo"]); modes.clear(); new Request(url, {method: modes.size ? "HEAD" : "POST", body});',
		'const object = {value: true}; Object.defineProperty(object, "value", {get() { return false; }}); fetch(url, {method: object.value ? "GET" : "POST", body});',
		'fetch(url, {method: (sideEffect(), "GET"), body});',
		// A quoted or computed key is the same property
		outdent`
			fetch(url, {
				'method': 'POST',
				body: 'x',
			});
		`,
		outdent`
			fetch(url, {
				['method']: 'POST',
				body: 'x',
			});
		`,
	],
	invalid: [
		'fetch(url, {body})',
		'new Request(url, {body})',
		'fetch(url, {method: "GET", body})',
		'new Request(url, {method: "GET", body})',
		'fetch(url, {method: "HEAD", body})',
		'new Request(url, {method: "HEAD", body})',
		'fetch(url, {method: "head", body})',
		'new Request(url, {method: "head", body})',
		'fetch(url, {method: true ? "GET" : "POST", body})',
		'new Request(url, {method: false ? "POST" : "HEAD", body})',
		'const condition = true; let value; fetch(url, {method: condition ? "GET" : value, body})',
		'const method = "head"; new Request(url, {method, body: "foo=bar"})',
		'const method = "head"; fetch(url, {method, body: "foo=bar"})',
		'fetch(url, {body}, extraArgument)',
		'new Request(url, {body}, extraArgument)',
		outdent`
			fetch(url, {
				body: undefined,
				body: 'foo=bar',
			});
		`,
		outdent`
			new Request(url, {
				body: undefined,
				body: 'foo=bar',
			});
		`,
		outdent`
			fetch(url, {
				method: 'post',
				body: 'foo=bar',
				method: 'HEAD',
			});
		`,
		outdent`
			new Request(url, {
				method: 'post',
				body: 'foo=bar',
				method: 'HEAD',
			});
		`,
		// A quoted or computed key is the same property
		'fetch(url, {[\'method\']: \'GET\', \'body\': \'x\'})',
		'fetch(url, {[\'body\']: \'x\'})',
		// A spread before `method` cannot replace it, a later own property wins
		'fetch(url, {...options, method: "GET", body: "x"})',
	],
});

// A `SpreadElement` after `method` can replace it, so the method is not known
test({
	valid: [
		'fetch(url, {method: "GET", ...{method: "POST"}, body: "x"});',
		'fetch(url, {method: "GET", ...options, body: "x"});',
	],
	invalid: [],
});

// `as`, `satisfies` and `!` are erased at compile time
test({
	valid: [],
	invalid: [
		...[
			'fetch(url, {method: "GET", body: "x"} as RequestInit);',
			'fetch(url, {method: "GET", body: "x"} satisfies RequestInit);',
			'fetch(url, {method: "GET", body: "x"}!);',
			'new Request(url, {method: "GET", body: "x"} as RequestInit);',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}, errors: 1})),
	],
});

// `'method'`, `['method']` and `[`method`]` are the same property
test({
	valid: [
		'fetch(url, {body: "x", [`method`]: "POST"});',
		'new Request(url, {body: "x", [`method`]: "POST"});',
	],
	invalid: [
		{
			code: 'fetch(url, {[`body`]: "x", method: "GET"});',
			errors: 1,
		},
		{
			code: 'fetch(url, {body: "x", [`method`]: "GET"});',
			errors: 1,
		},
		{
			code: 'fetch(url, {[`body`]: "x", [`method`]: "GET"});',
			errors: 1,
		},
	],
});
