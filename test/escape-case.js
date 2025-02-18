/* eslint-disable no-template-curly-in-string */
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const uppercaseTest = {
	errors: [{messageId: 'escape-uppercase'}],
};

const lowercaseTest = {
	options: ['lowercase'],
	errors: [{messageId: 'escape-lowercase'}],
};

// 'uppercase'
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
		'const foo = String.raw`\\uAaAa`;',

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
			output: String.raw`const foo = "\xA9";`,
			...uppercaseTest,
		},

		// Mixed cases
		{
			code: String.raw`const foo = "\xAa";`,
			output: String.raw`const foo = "\xAA";`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = "\uAaAa";`,
			output: String.raw`const foo = "\uAAAA";`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = "\u{AaAa}";`,
			output: String.raw`const foo = "\u{AAAA}";`,
			...uppercaseTest,
		},

		// Many
		{
			code: String.raw`const foo = "\xAab\xaab\xAAb\uAaAab\uaaaab\uAAAAb\u{AaAa}b\u{aaaa}b\u{AAAA}";`,
			output: String.raw`const foo = "\xAAb\xAAb\xAAb\uAAAAb\uAAAAb\uAAAAb\u{AAAA}b\u{AAAA}b\u{AAAA}";`,
			...uppercaseTest,
		},

		{
			code: String.raw`const foo = "\ud834";`,
			output: String.raw`const foo = "\uD834";`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = "\u{1d306}";`,
			output: String.raw`const foo = "\u{1D306}";`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = "\ud834foo";`,
			output: String.raw`const foo = "\uD834foo";`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = "foo\ud834";`,
			output: String.raw`const foo = "foo\uD834";`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = "foo \ud834";`,
			output: String.raw`const foo = "foo \uD834";`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = "\\\ud834foo";`,
			output: String.raw`const foo = "\\\uD834foo";`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = "foo\\\ud834";`,
			output: String.raw`const foo = "foo\\\uD834";`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = "foo \\\ud834";`,
			output: String.raw`const foo = "foo \\\uD834";`,
			...uppercaseTest,
		},

		// TemplateLiteral
		{
			code: 'const foo = `\\xa9`;',
			output: 'const foo = `\\xA9`;',
			...uppercaseTest,
		},
		{
			code: 'const foo = `\\ud834`;',
			output: 'const foo = `\\uD834`;',
			...uppercaseTest,
		},
		{
			code: 'const foo = `\\u{1d306}`;',
			output: 'const foo = `\\u{1D306}`;',
			...uppercaseTest,
		},
		{
			code: 'const foo = `\\ud834foo`;',
			output: 'const foo = `\\uD834foo`;',
			...uppercaseTest,
		},
		{
			code: 'const foo = `foo\\ud834`;',
			output: 'const foo = `foo\\uD834`;',
			...uppercaseTest,
		},
		{
			code: 'const foo = `foo \\ud834`;',
			output: 'const foo = `foo \\uD834`;',
			...uppercaseTest,
		},
		{
			code: 'const foo = `${"\ud834 foo"} \\ud834`;',
			output: 'const foo = `${"\uD834 foo"} \\uD834`;',
			...uppercaseTest,
		},
		{
			code: 'const foo = `\\ud834${foo}\\ud834${foo}\\ud834`;',
			output: 'const foo = `\\uD834${foo}\\uD834${foo}\\uD834`;',
			...uppercaseTest,
			errors: Array.from({length: 3}, () => uppercaseTest.errors[0]),
		},
		{
			code: 'const foo = `\\\\\\ud834foo`;',
			output: 'const foo = `\\\\\\uD834foo`;',
			...uppercaseTest,
		},
		{
			code: 'const foo = `foo\\\\\\ud834`;',
			output: 'const foo = `foo\\\\\\uD834`;',
			...uppercaseTest,
		},
		{
			code: 'const foo = `foo \\\\\\ud834`;',
			output: 'const foo = `foo \\\\\\uD834`;',
			...uppercaseTest,
		},
		// TODO: This is not safe, it will be broken if `tagged` uses `arguments[0].raw`
		// #2341
		{
			code: 'const foo = tagged`\\uAaAa`;',
			output: 'const foo = tagged`\\uAAAA`;',
			...uppercaseTest,
		},
		{
			code: 'const foo = `\\uAaAa```;',
			output: 'const foo = `\\uAAAA```;',
			...uppercaseTest,
		},

		// Mixed cases
		{
			code: 'const foo = `\\xAa`;',
			output: 'const foo = `\\xAA`;',
			...uppercaseTest,
		},
		{
			code: 'const foo = `\\uAaAa`;',
			output: 'const foo = `\\uAAAA`;',
			...uppercaseTest,
		},
		{
			code: 'const foo = `\\u{AaAa}`;',
			output: 'const foo = `\\u{AAAA}`;',
			...uppercaseTest,
		},

		// Many
		{
			code: 'const foo = `\\xAab\\xaab\\xAA${foo}\\uAaAab\\uaaaab\\uAAAAb\\u{AaAa}${foo}\\u{aaaa}b\\u{AAAA}`;',
			output: 'const foo = `\\xAAb\\xAAb\\xAA${foo}\\uAAAAb\\uAAAAb\\uAAAAb\\u{AAAA}${foo}\\u{AAAA}b\\u{AAAA}`;',
			...uppercaseTest,
			errors: Array.from({length: 3}, () => uppercaseTest.errors[0]),
		},

		// Literal regex
		{
			code: String.raw`const foo = /\xa9/;`,
			output: String.raw`const foo = /\xA9/;`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = /\ud834/`,
			output: String.raw`const foo = /\uD834/`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = /\u{1d306}/u`,
			output: String.raw`const foo = /\u{1D306}/u`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = /\ca/`,
			output: String.raw`const foo = /\cA/`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = /foo\\\xa9/;`,
			output: String.raw`const foo = /foo\\\xA9/;`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = /foo\\\\\xa9/;`,
			output: String.raw`const foo = /foo\\\\\xA9/;`,
			...uppercaseTest,
		},

		// Mixed cases
		{
			code: String.raw`const foo = /\xAa/;`,
			output: String.raw`const foo = /\xAA/;`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = /\uAaAa/;`,
			output: String.raw`const foo = /\uAAAA/;`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = /\u{AaAa}/;`,
			output: String.raw`const foo = /\u{AAAA}/;`,
			...uppercaseTest,
		},

		// Many
		{
			code: String.raw`const foo = /\xAab\xaab\xAAb\uAaAab\uaaaab\uAAAAb\u{AaAa}b\u{aaaa}b\u{AAAA}b\ca/;`,
			output: String.raw`const foo = /\xAAb\xAAb\xAAb\uAAAAb\uAAAAb\uAAAAb\u{AAAA}b\u{AAAA}b\u{AAAA}b\cA/;`,
			...uppercaseTest,
		},

		// RegExp
		{
			code: String.raw`const foo = new RegExp("/\xa9")`,
			output: String.raw`const foo = new RegExp("/\xA9")`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = new RegExp("/\ud834/")`,
			output: String.raw`const foo = new RegExp("/\uD834/")`,
			...uppercaseTest,
		},
		{
			code: String.raw`const foo = new RegExp("/\u{1d306}/", "u")`,
			output: String.raw`const foo = new RegExp("/\u{1D306}/", "u")`,
			...uppercaseTest,
		},
	],
});

// 'lowercase'
test({
	valid: [
		// Literal string
		String.raw`const foo = "\xa9";`,
		String.raw`const foo = "\ud834";`,
		String.raw`const foo = "\u{1d306}";`,
		String.raw`const foo = "\ud834foo";`,
		String.raw`const foo = "foo\ud834";`,
		String.raw`const foo = "foo \ud834";`,
		String.raw`const foo = "foo\\xBAR";`,
		String.raw`const foo = "foo\\uBARBAZ";`,
		String.raw`const foo = "foo\\\\xBAR";`,
		String.raw`const foo = "foo\\\\uBARBAZ";`,
		String.raw`const foo = "\cA";`,

		// TemplateLiteral
		'const foo = `\\xa9`;',
		'const foo = `\\ud834`;',
		'const foo = `\\u{1d306}`;',
		'const foo = `\\ud834FOO`;',
		'const foo = `foo\\ud834`;',
		'const foo = `foo \\ud834`;',
		'const foo = `${"\ud834 foo"} \\ud834`;',
		'const foo = `foo\\\\xBAR`;',
		'const foo = `foo\\\\uBARBAZ`;',
		'const foo = `foo\\\\\\\\xBAR`;',
		'const foo = `foo\\\\\\\\uBARBAZ`;',
		'const foo = `\\ca`;',
		'const foo = String.raw`\\uAaAa`;',

		// Literal regex
		String.raw`const foo = /foo\xa9/`,
		String.raw`const foo = /foo\ud834/`,
		String.raw`const foo = /foo\u{1d306}/u`,
		String.raw`const foo = /foo\ca/`,
		// Escape
		String.raw`const foo = /foo\\xA9/;`,
		String.raw`const foo = /foo\\\\xA9/;`,
		String.raw`const foo = /foo\\ud834/`,
		String.raw`const foo = /foo\\u{1}/u`,
		String.raw`const foo = /foo\\ca/`,

		// RegExp
		String.raw`const foo = new RegExp("/\xa9")`,
		String.raw`const foo = new RegExp("/\ud834/")`,
		String.raw`const foo = new RegExp("/\u{1d306}/", "u")`,
		String.raw`const foo = new RegExp("/\ca/")`,
		String.raw`const foo = new RegExp("/\cA/")`,
	].map(code => ({code, options: lowercaseTest.options})),
	invalid: [
		// Literal string
		{
			code: String.raw`const foo = "\xA9";`,
			output: String.raw`const foo = "\xa9";`,
			...lowercaseTest,
		},

		// Mixed cases
		{
			code: String.raw`const foo = "\xaA";`,
			output: String.raw`const foo = "\xaa";`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = "\uaAaA";`,
			output: String.raw`const foo = "\uaaaa";`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = "\u{aAaA}";`,
			output: String.raw`const foo = "\u{aaaa}";`,
			...lowercaseTest,
		},

		// Many
		{
			code: String.raw`const foo = "\xAab\xaAb\xaab\xAAb\uAaAab\uaaaab\uAAAAb\u{AaAa}b\u{aaaa}b\u{AAAA}";`,
			output: String.raw`const foo = "\xaab\xaab\xaab\xaab\uaaaab\uaaaab\uaaaab\u{aaaa}b\u{aaaa}b\u{aaaa}";`,
			...lowercaseTest,
		},

		{
			code: String.raw`const foo = "\uD834";`,
			output: String.raw`const foo = "\ud834";`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = "\u{1D306}";`,
			output: String.raw`const foo = "\u{1d306}";`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = "\uD834FOO";`,
			output: String.raw`const foo = "\ud834FOO";`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = "FOO\uD834";`,
			output: String.raw`const foo = "FOO\ud834";`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = "FOO \uD834";`,
			output: String.raw`const foo = "FOO \ud834";`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = "\\\uD834FOO";`,
			output: String.raw`const foo = "\\\ud834FOO";`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = "FOO\\\uD834";`,
			output: String.raw`const foo = "FOO\\\ud834";`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = "FOO \\\uD834";`,
			output: String.raw`const foo = "FOO \\\ud834";`,
			...lowercaseTest,
		},

		// TemplateLiteral
		{
			code: 'const foo = `\\xA9`;',
			output: 'const foo = `\\xa9`;',
			...lowercaseTest,
		},
		{
			code: 'const foo = `\\uD834`;',
			output: 'const foo = `\\ud834`;',
			...lowercaseTest,
		},
		{
			code: 'const foo = `\\u{1D306}`;',
			output: 'const foo = `\\u{1d306}`;',
			...lowercaseTest,
		},
		{
			code: 'const foo = `\\uD834FOO`;',
			output: 'const foo = `\\ud834FOO`;',
			...lowercaseTest,
		},
		{
			code: 'const foo = `FOO\\uD834`;',
			output: 'const foo = `FOO\\ud834`;',
			...lowercaseTest,
		},
		{
			code: 'const foo = `FOO \\uD834`;',
			output: 'const foo = `FOO \\ud834`;',
			...lowercaseTest,
		},
		{
			code: 'const foo = `${"\uD834 FOO"} \\uD834`;',
			output: 'const foo = `${"\ud834 FOO"} \\ud834`;',
			...lowercaseTest,
		},
		{
			code: 'const foo = `\\uD834${FOO}\\uD834${FOO}\\uD834`;',
			output: 'const foo = `\\ud834${FOO}\\ud834${FOO}\\ud834`;',
			...lowercaseTest,
			errors: Array.from({length: 3}, () => lowercaseTest.errors[0]),
		},
		{
			code: 'const foo = `\\\\\\uD834FOO`;',
			output: 'const foo = `\\\\\\ud834FOO`;',
			...lowercaseTest,
		},
		{
			code: 'const foo = `FOO\\\\\\uD834`;',
			output: 'const foo = `FOO\\\\\\ud834`;',
			...lowercaseTest,
		},
		{
			code: 'const foo = `FOO \\\\\\uD834`;',
			output: 'const foo = `FOO \\\\\\ud834`;',
			...lowercaseTest,
		},
		// TODO: This is not safe, it will be broken if `tagged` uses `arguments[0].raw`
		// #2341
		{
			code: 'const foo = tagged`\\uaAaA`;',
			output: 'const foo = tagged`\\uaaaa`;',
			...lowercaseTest,
		},
		{
			code: 'const foo = `\\uaAaA```;',
			output: 'const foo = `\\uaaaa```;',
			...lowercaseTest,
		},

		// Mixed cases
		{
			code: 'const foo = `\\xaA`;',
			output: 'const foo = `\\xaa`;',
			...lowercaseTest,
		},
		{
			code: 'const foo = `\\uaAaA`;',
			output: 'const foo = `\\uaaaa`;',
			...lowercaseTest,
		},
		{
			code: 'const foo = `\\u{aAaA}`;',
			output: 'const foo = `\\u{aaaa}`;',
			...lowercaseTest,
		},

		// Many
		{
			code: 'const foo = `\\xAab\\xaab\\xaAb\\xAA${foo}\\uAaAab\\uaaaab\\uAAAAb\\u{AaAa}${foo}\\u{aaaa}b\\u{AAAA}`;',
			output: 'const foo = `\\xaab\\xaab\\xaab\\xaa${foo}\\uaaaab\\uaaaab\\uaaaab\\u{aaaa}${foo}\\u{aaaa}b\\u{aaaa}`;',
			...lowercaseTest,
			errors: Array.from({length: 3}, () => lowercaseTest.errors[0]),
		},

		// Literal regex
		{
			code: String.raw`const foo = /\xA9/;`,
			output: String.raw`const foo = /\xa9/;`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = /\uD834/`,
			output: String.raw`const foo = /\ud834/`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = /\u{1D306}/u`,
			output: String.raw`const foo = /\u{1d306}/u`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = /\cA/`,
			output: String.raw`const foo = /\ca/`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = /FOO\\\xA9/;`,
			output: String.raw`const foo = /FOO\\\xa9/;`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = /FOO\\\\\xA9/;`,
			output: String.raw`const foo = /FOO\\\\\xa9/;`,
			...lowercaseTest,
		},

		// Mixed cases
		{
			code: String.raw`const foo = /\xaA/;`,
			output: String.raw`const foo = /\xaa/;`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = /\uaAaA/;`,
			output: String.raw`const foo = /\uaaaa/;`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = /\u{aAaA}/;`,
			output: String.raw`const foo = /\u{aaaa}/;`,
			...lowercaseTest,
		},

		// Many
		{
			code: String.raw`const foo = /\xAab\xaAb\xaab\xAAb\uAaAab\uaaaab\uAAAAb\u{AaAa}b\u{aaaa}b\u{AAAA}b\cA/;`,
			output: String.raw`const foo = /\xaab\xaab\xaab\xaab\uaaaab\uaaaab\uaaaab\u{aaaa}b\u{aaaa}b\u{aaaa}b\ca/;`,
			...lowercaseTest,
		},

		// RegExp
		{
			code: String.raw`const foo = new RegExp("/\xA9")`,
			output: String.raw`const foo = new RegExp("/\xa9")`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = new RegExp("/\uD834/")`,
			output: String.raw`const foo = new RegExp("/\ud834/")`,
			...lowercaseTest,
		},
		{
			code: String.raw`const foo = new RegExp("/\u{1D306}/", "u")`,
			output: String.raw`const foo = new RegExp("/\u{1d306}/", "u")`,
			...lowercaseTest,
		},
	],
});
