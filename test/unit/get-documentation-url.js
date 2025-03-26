import url from 'node:url';
import test from 'ava';
import getDocumentationUrl from '../../rules/utils/get-documentation-url.js';
import packageJson from '../../package.json' with {type: 'json'};

// eslint-disable-next-line unicorn/prefer-module -- We still use Node.js v18 for CI.
const filename = url.fileURLToPath(import.meta.url).replace(/\.js$/, '.js');

test('returns the URL of the a named rule\'s documentation', t => {
	const url = `https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v${packageJson.version}/docs/rules/foo.md`;
	t.is(getDocumentationUrl('foo.js'), url);
});

test('determines the rule name from the file', t => {
	const url = `https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v${packageJson.version}/docs/rules/get-documentation-url.md`;
	t.is(getDocumentationUrl(filename), url);
});
