import test from 'ava';
import pkg from '../package.json';
import getDocumentsUrl from '../rules/utils/get-documents-url';

test('returns the URL of the a named rule\'s documentation', t => {
	const url = `https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v${pkg.version}/docs/rules/foo.md`;
	t.is(getDocumentsUrl('foo.js'), url);
});

test('determines the rule name from the file', t => {
	const url = `https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v${pkg.version}/docs/rules/get-documents-url.md`;
	t.is(getDocumentsUrl(__filename), url);
});
