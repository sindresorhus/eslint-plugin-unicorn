/* eslint-disable no-template-curly-in-string */
import test from 'ava';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {getTester} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);
const RULE_ID = 'unicorn/prefer-unicode-code-point-escapes';

ruleTest.snapshot({
	valid: [
		String.raw`const foo = '\u{7A}'`,
		String.raw`const foo = '\u{1F4A9}'`,
		String.raw`const foo = '\x7A'`,
		String.raw`const foo = "\x7A"`,
		String.raw`const foo = '\u007A'`,
		String.raw`const foo = '\x20'`,
		String.raw`const foo = '\u007E'`,
		String.raw`const foo = '\n\t\r\\\'\"'`,
		String.raw`const foo = '\0'`,
		{
			code: String.raw`const element = <div title="\u0041" />;`,
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		String.raw`const foo = '\u0000\u0008\u0009\u000A\u000B\u000C\u000D\u0022\u0027\u002F\u005C\u0060'`,
		'const foo = `\\u000A\\u0060`',
		{
			code: String.raw`const foo = '\8\9\08'`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		String.raw`const foo = '\\u2661'`,
		String.raw`const foo = '\\x7A'`,
		'const foo = `\\x7A`',
		'const foo = `\\u007A`',
		'const foo = `\\\\\\x7A`',
		'const foo = tag`\\u2661`',
		'const foo = tag`\\123`',
		'const foo = String.raw`\\u2661`',
		String.raw`const foo = /\u{61}/u`,
		String.raw`const foo = /\u{61}/v`,
		String.raw`const foo = /[\uD83D\uDCA9]/u`,
		String.raw`const foo = /[\uD83D\uDCA9]/v`,
		String.raw`const foo = /[[\uD83D\uDCA9]\uD83D\uDCA9]/v`,
		String.raw`const foo = /\\[\uD83D\uDCA9]/u`,
		String.raw`const foo = /[\]\uD83D\uDCA9]/u`,
		String.raw`const foo = /\\u{61}/`,
		String.raw`const foo = /\u{XYZ}/`,
		String.raw`const foo = /\u{110000}/`,
		String.raw`const foo = /\u{}/`,
		String.raw`const foo = /\u{/`,
		String.raw`const foo = /\xZ/`,
		String.raw`const foo = /\uZZZZ/`,
		String.raw`const foo = /\cK/`,
		String.raw`const foo = new RegExp("\\u0061")`,
		{
			code: String.raw`const element = <Component value="\u2661" other="\xA9" />;`,
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
		String.raw`const foo = '\x1F'`,
		String.raw`const foo = '\u007F'`,
		String.raw`const foo = '\xa9'`,
		String.raw`const foo = '\u2661'`,
		String.raw`const foo = '\u00001'`,
		String.raw`const foo = '\uD800'`,
		String.raw`const foo = '\uD83D\uDCA9'`,
		String.raw`const foo = '\uD800\uDC00'`,
		String.raw`const foo = '\uDBFF\uDFFF'`,
		{
			code: String.raw`const foo = '\123'`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		{
			code: String.raw`const foo = '\00'`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		{
			code: String.raw`const foo = '\1\12\123\4\45'`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		{
			code: String.raw`const foo = '\377'`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		{
			code: String.raw`const foo = '\400'`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		String.raw`const foo = '\x7A\u2661\uD83D\uDCA9'`,
		'const foo = `\\x7A${bar}\\u2661`',
		String.raw`const foo = /\x7A/u`,
		String.raw`const foo = /\u0061/v`,
		String.raw`const foo = /\u000A/u`,
		String.raw`const foo = /\uD83D\uDCA9/u`,
		String.raw`const foo = /\uDFFF/u`,
		String.raw`const foo = /\[\uD83D\uDCA9/u`,
		String.raw`const foo = /[\\]\uD83D\uDCA9/u`,
		String.raw`const foo = /[\x2D]/u`,
		String.raw`const foo = /[\cA]/u`,
		String.raw`const foo = /\cA/u`,
		String.raw`const foo = /\ca/u`,
		String.raw`const foo = /\cZ/u`,
		String.raw`const foo = /\cA/`,
		String.raw`const foo = /\u0061/`,
		String.raw`const foo = /\u{61}/`,
		String.raw`const foo = /\\\u{61}/`,
		String.raw`const foo = /\x7A/g`,
		String.raw`const foo = /\x61\_/`,
		String.raw`const foo = /\u{61}\_/`,
		{
			code: String.raw`const element = <Component value={'\u2661'} />;`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'const foo = `line one\r\n\\u2661`;',
			output: 'const foo = `line one\r\n\\u{2661}`;',
			errors: [{messageId: 'prefer-unicode-code-point-escapes'}],
		},
	],
});

test('scans long backslash runs efficiently', t => {
	const code = `const value = /${'\\\\'.repeat(40_000)}/;`;
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
