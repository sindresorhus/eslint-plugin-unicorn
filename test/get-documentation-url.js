import test from 'ava';
import packageJson from '../package.json';
import getDocumentationUrl from '../rules/utils/get-documentation-url.js';

test('returns the URL of the a named rule\'s documentation', t => {
	const url = `https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v${packageJson.version}/docs/rules/foo.md`;
	t.is(getDocumentationUrl('foo.js'), url);
});

test('determines the rule name from the file', t => {
	const url = `https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v${packageJson.version}/docs/rules/get-documentation-url.md`;
	t.is(getDocumentationUrl(__filename), url);
});
