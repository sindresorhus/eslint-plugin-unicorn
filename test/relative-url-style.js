/* eslint-disable no-template-curly-in-string */
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'URL("./foo", base)',
		'new URL(...["./foo"], base)',
		'new URL(["./foo"], base)',
		'new URL("./foo")',
		'new URL("./foo", base, extra)',
		'new URL("./foo", ...[base])',
		'new NOT_URL("./foo", base)',
		'new NOT_URL("./", base)',
		'new URL("./", base)',
		'new URL("./", "https://example.com/a/b/c.html")',
		'const base = new URL("./", import.meta.url)',
		'new URL',
		'new URL(0, base)',
		// Not checking this case
		'new globalThis.URL("./foo", base)',
		'const foo = "./foo"; new URL(foo, base)',
		'const foo = "/foo"; new URL(`.${foo}`, base)',
		'new URL(`.${foo}`, base)',
		'new URL(".", base)',
		'new URL(".././foo", base)',
		// We don't check cooked value
		'new URL(`\\u002E/${foo}`, base)',
		// We don't check escaped string
		String.raw`new URL("\u002E/foo", base)`,
		String.raw`new URL('\u002E/foo', base)`,
	],
	invalid: [
		'new URL("./foo", base)',
		'new URL(\'./foo\', base)',
		'new URL("././a", base)',
		'new URL(`./${foo}`, base)',
		'new URL("./", "https://example.com/a/b/")',
	],
});

const alwaysAddDotSlashOptions = ['always'];
test.snapshot({
	valid: [
		'URL("foo", base)',
		'new URL(...["foo"], base)',
		'new URL(["foo"], base)',
		'new URL("foo")',
		'new URL("foo", base, extra)',
		'new URL("foo", ...[base])',
		'new NOT_URL("foo", base)',
		'new URL("", base)',
		'new URL("", "https://example.com/a/b.html")',
		'/* 2 */ new URL',
		'new URL(0, base2)',
		// Not checking this case
		'new globalThis.URL("foo", base)',
		'new URL(`${foo}`, base2)',
		'new URL(`.${foo}`, base2)',
		'new URL(".", base2)',
		'new URL("//example.org", "https://example.com")',
		'new URL("//example.org", "ftp://example.com")',
		'new URL("ftp://example.org", "https://example.com")',
		'new URL("https://example.org:65536", "https://example.com")',
		'new URL("/", base)',
		'new URL("/foo", base)',
		'new URL("../foo", base)',
		'new URL(".././foo", base)',
		String.raw`new URL("C:\foo", base)`,
		String.raw`new URL("\u002E/foo", base)`,
		String.raw`new URL("\u002Ffoo", base)`,
	].map(code => ({code, options: alwaysAddDotSlashOptions})),
	invalid: [
		'new URL("foo", base)',
		'new URL(\'foo\', base)',
		'new URL("", "https://example.com/a/b/")',
	].map(code => ({code, options: alwaysAddDotSlashOptions})),
});
