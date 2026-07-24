import {getTester, parsers} from './utils/test.js';
import {createFixtures} from './shared/no-unnecessary-length-or-infinity-rule-tests.js';

const {test} = getTester(import.meta);

test.snapshot(createFixtures('slice'));

// Unlike the `splice`/`toSpliced` rules, this rule must not skip known non-array receivers, because `String#slice()` and `TypedArray#slice()` are documented targets too.
test.snapshot({
	valid: [],
	invalid: [
		{
			code: 'function f(string: string) { return string.slice(1, string.length); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(bytes: Uint8Array) { return bytes.slice(1, bytes.length); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
