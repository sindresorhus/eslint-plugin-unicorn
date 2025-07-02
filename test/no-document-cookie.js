import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'document.cookie',
		'const foo = document.cookie',
		'foo = document.cookie',
		'foo = document?.cookie',
		'foo = document.cookie + ";foo=bar"',
		'delete document.cookie',
		'if (document.cookie.includes("foo")){}',
		'Object.assign(document, {cookie: "foo=bar"})',
		'document[CONSTANTS_COOKIE] = "foo=bar"',
		'document[cookie] = "foo=bar"',
		outdent`
			const CONSTANTS_COOKIE = "cookie";
			document[CONSTANTS_COOKIE] = "foo=bar";
		`,
	],
	invalid: [
		'document.cookie = "foo=bar"',
		'document.cookie += ";foo=bar"',
		'document.cookie = document.cookie + ";foo=bar"',
		'document.cookie &&= true',
		'document["coo" + "kie"] = "foo=bar"',
		'foo = document.cookie = "foo=bar"',
		'var doc = document; doc.cookie = "foo=bar"',
		'let doc = document; doc.cookie = "foo=bar"',
		'const doc = globalThis.document; doc.cookie = "foo=bar"',
		'window.document.cookie = "foo=bar"',
	],
});
