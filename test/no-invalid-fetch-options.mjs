import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'fetch(url, {method: "POST", body})',
		'new Request(url, {method: "POST", body})',
		'fetch(url, {method: "UNKNOWN", body})',
		'new Request(url, {method: "UNKNOWN", body})',
		'fetch(url, {body: undefined})',
		'new Request(url, {body: undefined})',
		'fetch(url, {body: null})',
		'new Request(url, {body: null})',
		'fetch(url, {...options, body})',
		'new Request(url, {...options, body})',
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
		'const method = "head"; new Request(url, {method, body: "foo=bar"})',
		'const method = "head"; fetch(url, {method, body, body: "foo=bar"})',
	],
});
