import test from 'ava';
import pkg from '../package.json';
import getDocsUrl from '../rules/utils/get-docs-url';

test('returns the URL of the a named rule\'s documentation', t => {
	const url = `https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v${pkg.version}/docs/rules/foo.md`;
	t.is(getDocsUrl('foo.js'), url);
});

test('determines the rule name from the file', t => {
	const url = `https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v${pkg.version}/docs/rules/get-docs-url.md`;
	t.is(getDocsUrl(__filename), url);
});
