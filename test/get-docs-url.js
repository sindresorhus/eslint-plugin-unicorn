import test from 'ava';
import getDocsUrl from '../rules/utils/get-docs-url';

test('returns the URL of the a named rule\'s documentation', t => {
	const url = 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/master/docs/rules/foo.md';
	t.is(getDocsUrl('foo'), url);
});

test('determines the rule name from the file', t => {
	const url = 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/master/docs/rules/get-docs-url.md';
	t.is(getDocsUrl(), url);
});
