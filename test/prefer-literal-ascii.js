import test from 'ava';
import {Linter} from 'eslint';
import json from '@eslint/json';
import unicorn from '../index.js';
import {getTester, languages, parsers} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);
const RULE_ID = 'unicorn/prefer-literal-ascii';

ruleTest.snapshot({
	valid: [
		'const value = \'A\';',
		String.raw`const value = '\x1F';`,
		String.raw`const value = '\u001F';`,
		String.raw`const value = '\u{1F}';`,
		String.raw`const value = '\x7F';`,
		String.raw`const value = '\u007F';`,
		String.raw`const value = '\u{7F}';`,
		String.raw`const value = '\x80';`,
		String.raw`const value = '\u0080';`,
		String.raw`const value = '\u{80}';`,
		String.raw`const value = '\n';`,
		String.raw`const value = '\\x41';`,
		String.raw`const value = '\\u0041';`,
		String.raw`const value = '\\u{41}';`,
		String.raw`const value = '\/';`,
		String.raw`const value = /\x41/;`,
		String.raw`const value = /\u0041/;`,
		String.raw`const value = /\u{41}/u;`,
		'const value = tag`\\x41\\u0041\\u{41}`;',
		'const value = String.raw`\\x41\\u0041\\u{41}`;',
		{
			code: String.raw`const element = <Component value="\u0041" />;`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
	],
	invalid: [
		String.raw`const value = '\x41';`,
		String.raw`const value = '\u0041';`,
		String.raw`const value = '\u{41}';`,
		String.raw`const value = '\u{000041}';`,
		String.raw`const value = '\u{00000041}';`,
		String.raw`const value = '\x20';`,
		String.raw`const value = '\u007E';`,
		String.raw`const value = '\x2F';`,
		String.raw`const value = '\u0039';`,
		String.raw`const value = '\x6a\u007e\u{7a}';`,
		String.raw`const value = '\x41\u0042\u{43}';`,
		String.raw`const value = '\x41\xA9';`,
		String.raw`const value = '\\\x41';`,
		String.raw`const value = "\u0022";`,
		String.raw`const value = '\u0027';`,
		String.raw`const value = '\u0022';`,
		String.raw`const value = "\u0027";`,
		String.raw`const value = '\u005C';`,
		'const value = `\\x41\\u0042\\u{43}`;',
		'const value = `\\u0060`;',
		'const value = `\\u0024{value}`;',
		'const value = `$\\u007Bvalue}`;',
		'const value = `\\u0024\\u007Bvalue}`;',
		'const value = `\\\\\\u0024\\u007Bvalue}`;',
		// eslint-disable-next-line no-template-curly-in-string
		'const value = `\\u0024${value}`;',
		// eslint-disable-next-line no-template-curly-in-string
		'const value = `\\x41${value}\\u0042`;',
		{
			code: String.raw`const element = <Component value={'\u0041'} />;`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		{
			code: 'type Value<T extends string> = `\\u0024\\u007BT}`;',
			languageOptions: {parser: parsers.typescript},
		},
		String.raw`'\u0075se strict';`,
		String.raw`function function_() {'\u0075se strict';}`,
		String.raw`const value = '\0\u0031';`,
		String.raw`const value = '\0\u0038';`,
		{
			code: String.raw`const value = '\1\u0032';`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		{
			code: String.raw`const value = '\1\u0037';`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		{
			code: String.raw`const value = '\00\u0031';`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		{
			code: String.raw`const value = '\\0\u0031';`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		{
			code: String.raw`const value = '\1\u0038';`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		'const value = `\\0\\u0031`;',
		{
			code: String.raw`const value = '\123\u0034';`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		{
			code: String.raw`const value = '\40\u0031';`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		{
			code: String.raw`const value = '\37\u0031';`,
			languageOptions: {
				sourceType: 'script',
			},
		},
	],
});

ruleTest({
	valid: [],
	invalid: [
		{
			// eslint-disable-next-line no-template-curly-in-string
			code: 'const value = `a\\u0041\r\n${value}b`;',
			// eslint-disable-next-line no-template-curly-in-string
			output: 'const value = `aA\r\n${value}b`;',
			errors: 1,
		},
		{
			code: 'type Value = `\\x\\u0034\\u0031`;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'type Value = `\\x\\u0041\\u0042`;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'type Value = `\\u\\u0030\\u0030\\u0034\\u0031`;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'type Value = `\\u{\\u0034\\u0031}`;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'type Value = `\\u{4\\u007D`;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'type Value = `\\u\\u007B41}`;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'type Value = `\\x\\u0047`;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'type Value = `\\\\x\\u0034\\u0031`;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'type Value = `\\xA9\\u0041`;',
			languageOptions: {parser: parsers.typescript},
			output: 'type Value = `\\xA9A`;',
			errors: 1,
		},
	],
});

for (const language of ['json/json', 'json/jsonc', 'json/json5']) {
	const languageConfig = {language, plugins: {json}};

	ruleTest({
		valid: [
			String.raw`{"value":"\u001F\u0080"}`,
			String.raw`{"value":"\\u0041"}`,
		].map(code => ({code, name: `${language}: ${code}`, ...languageConfig})),
		invalid: [
			{
				code: String.raw`{"\u0041":"\u0042"}`,
				output: '{"A":"B"}',
				errors: 2,
			},
			{
				code: String.raw`{"value":"\/"}`,
				output: '{"value":"/"}',
				errors: 1,
			},
			{
				code: String.raw`{"value":"\\\/"}`,
				output: String.raw`{"value":"\\/"}`,
				errors: 1,
			},
			{
				code: String.raw`{"value":"\u0022\u005C"}`,
				output: String.raw`{"value":"\"\\"}`,
				errors: 1,
			},
		].map(testCase => ({...testCase, name: `${language}: ${testCase.code}`, ...languageConfig})),
	});
}

ruleTest({
	testerOptions: {language: languages.css.language, plugins: languages.css.plugins},
	valid: [
		String.raw`/* \41 */ a { content: "\\41 \1f"; }`,
		String.raw`a { content: "\1f\7f\80"; }`,
		String.raw`a { background: url(\41.png); }`,
		String.raw`a { background: url("\41.png"); }`,
		String.raw`a { background: \75rl("\41.png"); }`,
		String.raw`a { background: \75rl(/* keep */ "\41.png"); }`,
		String.raw`.\31 0 { color: red; }`,
		String.raw`.a\20 b { color: red; }`,
		String.raw`.a\2f b { color: red; }`,
		String.raw`#\31 a { color: red; }`,
		String.raw`#\2d { color: red; }`,
		String.raw`a { content: "\0000041"; }`,
	],
	invalid: [
		{code: String.raw`a { content: "\41 \000042\20 C"; }`, output: 'a { content: "AB C"; }', errors: 1},
		{code: String.raw`a { content: "\22 \5c " ; }`, output: String.raw`a { content: "\"\\" ; }`, errors: 1},
		{code: String.raw`.\41 B#\43 { --\44: 1p\78; }`, output: String.raw`.AB#\43 { --D: 1px; }`, errors: 4},
		{code: String.raw`#\43 { color: red; }`, output: '#C{ color: red; }', errors: 1},
		{code: String.raw`@\6d edia screen { a { content: "A"; } }`, output: '@media screen { a { content: "A"; } }', errors: 1},
		{code: String.raw`@import "\41.css";`, output: '@import "A.css";', errors: 1},
		{code: String.raw`a { content: "\\\41 \7e"; }`, output: String.raw`a { content: "\\A~"; }`, errors: 1},
	],
});

ruleTest({
	valid: [
		{
			code: String.raw`{"value":"A" /* \u0042 \/ */}`,
			language: 'json/jsonc',
			plugins: {json},
		},
		{
			code: String.raw`{\u0041: 1}`,
			language: 'json/json5',
			plugins: {json},
		},
	],
	invalid: [
		{
			code: String.raw`"\u0041\/"`,
			output: '"A/"',
			language: 'json/json',
			plugins: {json},
			errors: 1,
		},
		{
			code: String.raw`{key: '\x41', '\u0042': '\/'}`,
			output: '{key: \'A\', \'B\': \'/\'}',
			language: 'json/json5',
			plugins: {json},
			errors: 3,
		},
		{
			code: String.raw`{'key': '\u0027\/'}`,
			output: String.raw`{'key': '\'/'}`,
			language: 'json/json5',
			plugins: {json},
			errors: 1,
		},
		{
			code: String.raw`{value: '\0\u0031'}`,
			language: 'json/json5',
			plugins: {json},
			errors: 1,
		},
	],
});

test('works with `prefer-unicode-code-point-escapes`', t => {
	const linter = new Linter({configType: 'flat'});
	const code = String.raw`const value = '\x41\xA9';`;
	const result = linter.verifyAndFix(code, [{
		plugins: {unicorn},
		rules: {
			[RULE_ID]: 'error',
			'unicorn/prefer-unicode-code-point-escapes': 'error',
		},
	}]);

	t.true(result.fixed);
	t.is(result.output, String.raw`const value = 'A\u{A9}';`);
	t.deepEqual(result.messages, []);
});

test('scans long backslash runs efficiently', t => {
	const code = `const value = '${'\\\\'.repeat(40_000)}';`;
	const linter = new Linter({configType: 'flat'});
	const config = {
		plugins: {unicorn},
		rules: {
			[RULE_ID]: 'error',
		},
	};
	const startTime = performance.now();
	const messages = linter.verify(code, config);
	const duration = performance.now() - startTime;

	t.deepEqual(messages, []);
	t.true(duration < 2000, `Expected linting to take less than 2 seconds, but it took ${duration} milliseconds.`);
});
