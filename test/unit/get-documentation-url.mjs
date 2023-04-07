/* eslint import/order: ["error", {"newlines-between": "ignore"}] */
import {createRequire} from 'node:module';
import url from 'node:url';
import test from 'ava';
import getDocumentationUrl from '../../rules/utils/get-documentation-url.js';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');

const filename = url.fileURLToPath(import.meta.url).replace(/\.mjs$/, '.js');

test('returns the URL of the a named rule\'s documentation', t => {
	const url = `https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v${packageJson.version}/docs/rules/foo.md`;
	t.is(getDocumentationUrl('foo.js'), url);
});

test('determines the rule name from the file', t => {
	const url = `https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v${packageJson.version}/docs/rules/get-documentation-url.md`;
	t.is(getDocumentationUrl(filename), url);
});
