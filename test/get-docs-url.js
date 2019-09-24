import test from 'ava';
import pkg from '../package';
import getDocsUrl from '../rules/utils/get-docs-url';

test('returns the URL of the a named rule\'s documentation', t => {
	const url = `https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v${pkg.version}/docs/rules/foo.md`;
	t.is(getDocsUrl('foo'), url);
});
