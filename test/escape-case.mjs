/* eslint-disable no-template-curly-in-string */
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const errors = [
	{
		messageId: 'escape-case',
	},
];

test({
	valid: [
		// Literal string
		String.raw`const foo = "\xA9";`,
		String.raw`const foo = "\uD834";`,
		String.raw`const foo = "\u{1D306}";`,
		String.raw`const foo = "\uD834foo";`,
		String.raw`const foo = "foo\uD834";`,
		String.raw`const foo = "foo \uD834";`,
		String.raw`const foo = "foo \u2500";`,
		String.raw`const foo = "foo \x46";`,
		String.raw`const foo = "foo\\xbar";`,
		String.raw`const foo = "foo\\ubarbaz";`,
		String.raw`const foo = "foo\\\\xbar";`,
		String.raw`const foo = "foo\\\\ubarbaz";`,
		String.raw`const foo = "\ca";`,

		// TemplateLiteral
		'const foo = `\\xA9`;',
		'const foo = `\\uD834`;',
		'const foo = `\\u{1D306}`;',
		'const foo = `\\uD834foo`;',
		'const foo = `foo\\uD834`;',
		'const foo = `foo \\uD834`;',
		'const foo = `${"\uD834 foo"} \\uD834`;',
		'const foo = `foo \\u2500`;',
		'const foo = `foo \\x46`;',
		'const foo = `foo\\\\xbar`;',
		'const foo = `foo\\\\ubarbaz`;',
		'const foo = `foo\\\\\\\\xbar`;',
		'const foo = `foo\\\\\\\\ubarbaz`;',
		'const foo = `\\ca`;',

		// Literal regex
		String.raw`const foo = /foo\xA9/`,
		String.raw`const foo = /foo\uD834/`,
		String.raw`const foo = /foo\u{1D306}/u`,
		String.raw`const foo = /foo\cA/`,
		// Escape
		String.raw`const foo = /foo\\xa9/;`,
		String.raw`const foo = /foo\\\\xa9/;`,
		String.raw`const foo = /foo\\uD834/`,
		String.raw`const foo = /foo\\u{1}/u`,
		String.raw`const foo = /foo\\cA/`,

		// RegExp
		String.raw`const foo = new RegExp("/\xA9")`,
		String.raw`const foo = new RegExp("/\uD834/")`,
		String.raw`const foo = new RegExp("/\u{1D306}/", "u")`,
		String.raw`const foo = new RegExp("/\ca/")`,
		String.raw`const foo = new RegExp("/\cA/")`,
	],
	invalid: [
		// Literal string
		{
			code: String.raw`const foo = "\xa9";`,
			errors,
			output: String.raw`const foo = "\xA9";`,
		},

		// Mixed cases
		{
			code: String.raw`const foo = "\xAa";`,
			errors,
			output: String.raw`const foo = "\xAA";`,
		},
		{
			code: String.raw`const foo = "\uAaAa";`,
			errors,
			output: String.raw`const foo = "\uAAAA";`,
		},
		{
			code: String.raw`const foo = "\u{AaAa}";`,
			errors,
			output: String.raw`const foo = "\u{AAAA}";`,
		},

		// Many
		{
			code: String.raw`const foo = "\xAab\xaab\xAAb\uAaAab\uaaaab\uAAAAb\u{AaAa}b\u{aaaa}b\u{AAAA}";`,
			errors,
			output: String.raw`const foo = "\xAAb\xAAb\xAAb\uAAAAb\uAAAAb\uAAAAb\u{AAAA}b\u{AAAA}b\u{AAAA}";`,
		},

		{
			code: String.raw`const foo = "\ud834";`,
			errors,
			output: String.raw`const foo = "\uD834";`,
		},
		{
			code: String.raw`const foo = "\u{1d306}";`,
			errors,
			output: String.raw`const foo = "\u{1D306}";`,
		},
		{
			code: String.raw`const foo = "\ud834foo";`,
			errors,
			output: String.raw`const foo = "\uD834foo";`,
		},
		{
			code: String.raw`const foo = "foo\ud834";`,
			errors,
			output: String.raw`const foo = "foo\uD834";`,
		},
		{
			code: String.raw`const foo = "foo \ud834";`,
			errors,
			output: String.raw`const foo = "foo \uD834";`,
		},
		{
			code: String.raw`const foo = "\\\ud834foo";`,
			errors,
			output: String.raw`const foo = "\\\uD834foo";`,
		},
		{
			code: String.raw`const foo = "foo\\\ud834";`,
			errors,
			output: String.raw`const foo = "foo\\\uD834";`,
		},
		{
			code: String.raw`const foo = "foo \\\ud834";`,
			errors,
			output: String.raw`const foo = "foo \\\uD834";`,
		},

		// TemplateLiteral
		{
			code: 'const foo = `\\xa9`;',
			errors,
			output: 'const foo = `\\xA9`;',
		},
		{
			code: 'const foo = `\\ud834`;',
			errors,
			output: 'const foo = `\\uD834`;',
		},
		{
			code: 'const foo = `\\u{1d306}`;',
			errors,
			output: 'const foo = `\\u{1D306}`;',
		},
		{
			code: 'const foo = `\\ud834foo`;',
			errors,
			output: 'const foo = `\\uD834foo`;',
		},
		{
			code: 'const foo = `foo\\ud834`;',
			errors,
			output: 'const foo = `foo\\uD834`;',
		},
		{
			code: 'const foo = `foo \\ud834`;',
			errors,
			output: 'const foo = `foo \\uD834`;',
		},
		{
			code: 'const foo = `${"\ud834 foo"} \\ud834`;',
			errors,
			output: 'const foo = `${"\uD834 foo"} \\uD834`;',
		},
		{
			code: 'const foo = `\\ud834${foo}\\ud834${foo}\\ud834`;',
			errors: Array.from({length: 3}, () => errors[0]),
			output: 'const foo = `\\uD834${foo}\\uD834${foo}\\uD834`;',
		},
		{
			code: 'const foo = `\\\\\\ud834foo`;',
			errors,
			output: 'const foo = `\\\\\\uD834foo`;',
		},
		{
			code: 'const foo = `foo\\\\\\ud834`;',
			errors,
			output: 'const foo = `foo\\\\\\uD834`;',
		},
		{
			code: 'const foo = `foo \\\\\\ud834`;',
			errors,
			output: 'const foo = `foo \\\\\\uD834`;',
		},

		// Mixed cases
		{
			code: 'const foo = `\\xAa`;',
			errors,
			output: 'const foo = `\\xAA`;',
		},
		{
			code: 'const foo = `\\uAaAa`;',
			errors,
			output: 'const foo = `\\uAAAA`;',
		},
		{
			code: 'const foo = `\\u{AaAa}`;',
			errors,
			output: 'const foo = `\\u{AAAA}`;',
		},

		// Many
		{
			code: 'const foo = `\\xAab\\xaab\\xAA${foo}\\uAaAab\\uaaaab\\uAAAAb\\u{AaAa}${foo}\\u{aaaa}b\\u{AAAA}`;',
			errors: Array.from({length: 3}, () => errors[0]),
			output: 'const foo = `\\xAAb\\xAAb\\xAA${foo}\\uAAAAb\\uAAAAb\\uAAAAb\\u{AAAA}${foo}\\u{AAAA}b\\u{AAAA}`;',
		},

		// Literal regex
		{
			code: String.raw`const foo = /\xa9/;`,
			errors,
			output: String.raw`const foo = /\xA9/;`,
		},
		{
			code: String.raw`const foo = /\ud834/`,
			errors,
			output: String.raw`const foo = /\uD834/`,
		},
		{
			code: String.raw`const foo = /\u{1d306}/u`,
			errors,
			output: String.raw`const foo = /\u{1D306}/u`,
		},
		{
			code: String.raw`const foo = /\ca/`,
			errors,
			output: String.raw`const foo = /\cA/`,
		},
		{
			code: String.raw`const foo = /foo\\\xa9/;`,
			errors,
			output: String.raw`const foo = /foo\\\xA9/;`,
		},
		{
			code: String.raw`const foo = /foo\\\\\xa9/;`,
			errors,
			output: String.raw`const foo = /foo\\\\\xA9/;`,
		},

		// Mixed cases
		{
			code: String.raw`const foo = /\xAa/;`,
			errors,
			output: String.raw`const foo = /\xAA/;`,
		},
		{
			code: String.raw`const foo = /\uAaAa/;`,
			errors,
			output: String.raw`const foo = /\uAAAA/;`,
		},
		{
			code: String.raw`const foo = /\u{AaAa}/;`,
			errors,
			output: String.raw`const foo = /\u{AAAA}/;`,
		},

		// Many
		{
			code: String.raw`const foo = /\xAab\xaab\xAAb\uAaAab\uaaaab\uAAAAb\u{AaAa}b\u{aaaa}b\u{AAAA}b\ca/;`,
			errors,
			output: String.raw`const foo = /\xAAb\xAAb\xAAb\uAAAAb\uAAAAb\uAAAAb\u{AAAA}b\u{AAAA}b\u{AAAA}b\cA/;`,
		},

		// RegExp
		{
			code: String.raw`const foo = new RegExp("/\xa9")`,
			errors,
			output: String.raw`const foo = new RegExp("/\xA9")`,
		},
		{
			code: String.raw`const foo = new RegExp("/\ud834/")`,
			errors,
			output: String.raw`const foo = new RegExp("/\uD834/")`,
		},
		{
			code: String.raw`const foo = new RegExp("/\u{1d306}/", "u")`,
			errors,
			output: String.raw`const foo = new RegExp("/\u{1D306}/", "u")`,
		},
	],
});
