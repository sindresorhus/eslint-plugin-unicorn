import test from 'ava';
import getDocsUrl from '../rules/utils/get-docs-url';

test('returns the URL of the a named rule\'s documentation', t => {
	t.plan(1);
	const url = 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/master/docs/rules/foo.md';
	t.is(getDocsUrl('foo'), url);
});

test('returns the URL of the a named rule\'s documentation at a commit hash', t => {
	t.plan(1);
	const url = 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/bar/docs/rules/foo.md';
	t.is(getDocsUrl('foo', 'bar'), url);
});
