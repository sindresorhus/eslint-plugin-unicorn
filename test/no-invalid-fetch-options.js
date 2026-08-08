import outdent from 'outdent';
import {getTester} from './utils/test.js';

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
	],
});
