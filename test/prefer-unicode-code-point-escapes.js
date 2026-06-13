/* eslint-disable no-template-curly-in-string */
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		String.raw`const foo = '\u{7A}'`,
		String.raw`const foo = '\u{1F4A9}'`,
		String.raw`const foo = '\n\t\r\\\'\"'`,
		String.raw`const foo = '\0'`,
		String.raw`const foo = '\\u2661'`,
		String.raw`const foo = '\\x7A'`,
		'const foo = tag`\\u2661`',
		'const foo = String.raw`\\u2661`',
		String.raw`const foo = /\u{61}/u`,
		String.raw`const foo = /\u{61}/v`,
		String.raw`const foo = /[\uD83D\uDCA9]/u`,
		String.raw`const foo = new RegExp("\\u0061")`,
	],
	invalid: [
		String.raw`const foo = '\x7A'`,
		String.raw`const foo = '\xa9'`,
		String.raw`const foo = '\u2661'`,
		String.raw`const foo = '\uD83D\uDCA9'`,
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
		String.raw`const foo = '\x7A\u2661\uD83D\uDCA9'`,
		'const foo = `\\x7A${bar}\\u2661`',
		'const foo = `\\\\\\x7A`',
		String.raw`const foo = /\x7A/u`,
		String.raw`const foo = /\u0061/v`,
		String.raw`const foo = /\uD83D\uDCA9/u`,
		String.raw`const foo = /\[\uD83D\uDCA9/u`,
		String.raw`const foo = /\cA/u`,
		String.raw`const foo = /\u0061/`,
		String.raw`const foo = /\u{61}/`,
		String.raw`const foo = /\x7A/g`,
		String.raw`const foo = /\x61\_/`,
	],
});
