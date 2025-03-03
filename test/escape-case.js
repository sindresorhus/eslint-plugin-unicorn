/* eslint-disable no-template-curly-in-string */
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const MESSAGE_ID_UPPERCASE = 'escape-uppercase';
const MESSAGE_ID_LOWERCASE = 'escape-lowercase';

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
		},

		// Mixed cases
		{
			code: String.raw`const foo = "\xAa";`,
			output: String.raw`const foo = "\xAA";`,
		},
		{
			code: String.raw`const foo = "\uAaAa";`,
			output: String.raw`const foo = "\uAAAA";`,
		},
		{
			code: String.raw`const foo = "\u{AaAa}";`,
			output: String.raw`const foo = "\u{AAAA}";`,
		},

		// Many
		{
			code: String.raw`const foo = "\xAab\xaab\xAAb\uAaAab\uaaaab\uAAAAb\u{AaAa}b\u{aaaa}b\u{AAAA}";`,
			output: String.raw`const foo = "\xAAb\xAAb\xAAb\uAAAAb\uAAAAb\uAAAAb\u{AAAA}b\u{AAAA}b\u{AAAA}";`,
		},

		{
			code: String.raw`const foo = "\ud834";`,
			output: String.raw`const foo = "\uD834";`,
		},
		{
			code: String.raw`const foo = "\u{1d306}";`,
			output: String.raw`const foo = "\u{1D306}";`,
		},
		{
			code: String.raw`const foo = "\ud834foo";`,
			output: String.raw`const foo = "\uD834foo";`,
		},
		{
			code: String.raw`const foo = "foo\ud834";`,
			output: String.raw`const foo = "foo\uD834";`,
		},
		{
			code: String.raw`const foo = "foo \ud834";`,
			output: String.raw`const foo = "foo \uD834";`,
		},
		{
			code: String.raw`const foo = "\\\ud834foo";`,
			output: String.raw`const foo = "\\\uD834foo";`,
		},
		{
			code: String.raw`const foo = "foo\\\ud834";`,
			output: String.raw`const foo = "foo\\\uD834";`,
		},
		{
			code: String.raw`const foo = "foo \\\ud834";`,
			output: String.raw`const foo = "foo \\\uD834";`,
		},

		// TemplateLiteral
		{
			code: 'const foo = `\\xa9`;',
			output: 'const foo = `\\xA9`;',
		},
		{
			code: 'const foo = `\\ud834`;',
			output: 'const foo = `\\uD834`;',
		},
		{
			code: 'const foo = `\\u{1d306}`;',
			output: 'const foo = `\\u{1D306}`;',
		},
		{
			code: 'const foo = `\\ud834foo`;',
			output: 'const foo = `\\uD834foo`;',
		},
		{
			code: 'const foo = `foo\\ud834`;',
			output: 'const foo = `foo\\uD834`;',
		},
		{
			code: 'const foo = `foo \\ud834`;',
			output: 'const foo = `foo \\uD834`;',
		},
		{
			code: 'const foo = `${"\ud834 foo"} \\ud834`;',
			output: 'const foo = `${"\uD834 foo"} \\uD834`;',
		},
		{
			code: 'const foo = `\\ud834${foo}\\ud834${foo}\\ud834`;',
			output: 'const foo = `\\uD834${foo}\\uD834${foo}\\uD834`;',
			errors: Array.from({length: 3}, () => ({messageId: MESSAGE_ID_UPPERCASE})),
		},
		{
			code: 'const foo = `\\\\\\ud834foo`;',
			output: 'const foo = `\\\\\\uD834foo`;',
		},
		{
			code: 'const foo = `foo\\\\\\ud834`;',
			output: 'const foo = `foo\\\\\\uD834`;',
		},
		{
			code: 'const foo = `foo \\\\\\ud834`;',
			output: 'const foo = `foo \\\\\\uD834`;',
		},
		// TODO: This is not safe, it will be broken if `tagged` uses `arguments[0].raw`
		// #2341
		{
			code: 'const foo = tagged`\\uAaAa`;',
			output: 'const foo = tagged`\\uAAAA`;',
		},
		{
			code: 'const foo = `\\uAaAa```;',
			output: 'const foo = `\\uAAAA```;',
		},

		// Mixed cases
		{
			code: 'const foo = `\\xAa`;',
			output: 'const foo = `\\xAA`;',
		},
		{
			code: 'const foo = `\\uAaAa`;',
			output: 'const foo = `\\uAAAA`;',
		},
		{
			code: 'const foo = `\\u{AaAa}`;',
			output: 'const foo = `\\u{AAAA}`;',
		},

		// Many
		{
			code: 'const foo = `\\xAab\\xaab\\xAA${foo}\\uAaAab\\uaaaab\\uAAAAb\\u{AaAa}${foo}\\u{aaaa}b\\u{AAAA}`;',
			output: 'const foo = `\\xAAb\\xAAb\\xAA${foo}\\uAAAAb\\uAAAAb\\uAAAAb\\u{AAAA}${foo}\\u{AAAA}b\\u{AAAA}`;',
			errors: Array.from({length: 3}, () => ({messageId: MESSAGE_ID_UPPERCASE})),
		},

		// Literal regex
		{
			code: String.raw`const foo = /\xa9/;`,
			output: String.raw`const foo = /\xA9/;`,
		},
		{
			code: String.raw`const foo = /\ud834/`,
			output: String.raw`const foo = /\uD834/`,
		},
		{
			code: String.raw`const foo = /\u{1d306}/u`,
			output: String.raw`const foo = /\u{1D306}/u`,
		},
		{
			code: String.raw`const foo = /\ca/`,
			output: String.raw`const foo = /\cA/`,
		},
		{
			code: String.raw`const foo = /foo\\\xa9/;`,
			output: String.raw`const foo = /foo\\\xA9/;`,
		},
		{
			code: String.raw`const foo = /foo\\\\\xa9/;`,
			output: String.raw`const foo = /foo\\\\\xA9/;`,
		},

		// Mixed cases
		{
			code: String.raw`const foo = /\xAa/;`,
			output: String.raw`const foo = /\xAA/;`,
		},
		{
			code: String.raw`const foo = /\uAaAa/;`,
			output: String.raw`const foo = /\uAAAA/;`,
		},
		{
			code: String.raw`const foo = /\u{AaAa}/;`,
			output: String.raw`const foo = /\u{AAAA}/;`,
		},

		// Many
		{
			code: String.raw`const foo = /\xAab\xaab\xAAb\uAaAab\uaaaab\uAAAAb\u{AaAa}b\u{aaaa}b\u{AAAA}b\ca/;`,
			output: String.raw`const foo = /\xAAb\xAAb\xAAb\uAAAAb\uAAAAb\uAAAAb\u{AAAA}b\u{AAAA}b\u{AAAA}b\cA/;`,
		},

		// RegExp
		{
			code: String.raw`const foo = new RegExp("/\xa9")`,
			output: String.raw`const foo = new RegExp("/\xA9")`,
		},
		{
			code: String.raw`const foo = new RegExp("/\ud834/")`,
			output: String.raw`const foo = new RegExp("/\uD834/")`,
		},
		{
			code: String.raw`const foo = new RegExp("/\u{1d306}/", "u")`,
			output: String.raw`const foo = new RegExp("/\u{1D306}/", "u")`,
		},
	].map(item => ({errors: [{messageId: MESSAGE_ID_UPPERCASE}], ...item})),
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
	].map(code => ({code, options: ['lowercase']})),
	invalid: [
		// Literal string
		{
			code: String.raw`const foo = "\xA9";`,
			output: String.raw`const foo = "\xa9";`,
		},

		// Mixed cases
		{
			code: String.raw`const foo = "\xaA";`,
			output: String.raw`const foo = "\xaa";`,
		},
		{
			code: String.raw`const foo = "\uaAaA";`,
			output: String.raw`const foo = "\uaaaa";`,
		},
		{
			code: String.raw`const foo = "\u{aAaA}";`,
			output: String.raw`const foo = "\u{aaaa}";`,
		},

		// Many
		{
			code: String.raw`const foo = "\xAab\xaAb\xaab\xAAb\uAaAab\uaaaab\uAAAAb\u{AaAa}b\u{aaaa}b\u{AAAA}";`,
			output: String.raw`const foo = "\xaab\xaab\xaab\xaab\uaaaab\uaaaab\uaaaab\u{aaaa}b\u{aaaa}b\u{aaaa}";`,
		},

		{
			code: String.raw`const foo = "\uD834";`,
			output: String.raw`const foo = "\ud834";`,
		},
		{
			code: String.raw`const foo = "\u{1D306}";`,
			output: String.raw`const foo = "\u{1d306}";`,
		},
		{
			code: String.raw`const foo = "\uD834FOO";`,
			output: String.raw`const foo = "\ud834FOO";`,
		},
		{
			code: String.raw`const foo = "FOO\uD834";`,
			output: String.raw`const foo = "FOO\ud834";`,
		},
		{
			code: String.raw`const foo = "FOO \uD834";`,
			output: String.raw`const foo = "FOO \ud834";`,
		},
		{
			code: String.raw`const foo = "\\\uD834FOO";`,
			output: String.raw`const foo = "\\\ud834FOO";`,
		},
		{
			code: String.raw`const foo = "FOO\\\uD834";`,
			output: String.raw`const foo = "FOO\\\ud834";`,
		},
		{
			code: String.raw`const foo = "FOO \\\uD834";`,
			output: String.raw`const foo = "FOO \\\ud834";`,
		},

		// TemplateLiteral
		{
			code: 'const foo = `\\xA9`;',
			output: 'const foo = `\\xa9`;',
		},
		{
			code: 'const foo = `\\uD834`;',
			output: 'const foo = `\\ud834`;',
		},
		{
			code: 'const foo = `\\u{1D306}`;',
			output: 'const foo = `\\u{1d306}`;',
		},
		{
			code: 'const foo = `\\uD834FOO`;',
			output: 'const foo = `\\ud834FOO`;',
		},
		{
			code: 'const foo = `FOO\\uD834`;',
			output: 'const foo = `FOO\\ud834`;',
		},
		{
			code: 'const foo = `FOO \\uD834`;',
			output: 'const foo = `FOO \\ud834`;',
		},
		{
			code: 'const foo = `${"\uD834 FOO"} \\uD834`;',
			output: 'const foo = `${"\ud834 FOO"} \\ud834`;',
		},
		{
			code: 'const foo = `\\uD834${FOO}\\uD834${FOO}\\uD834`;',
			output: 'const foo = `\\ud834${FOO}\\ud834${FOO}\\ud834`;',
			errors: Array.from({length: 3}, () => ({messageId: MESSAGE_ID_LOWERCASE})),
		},
		{
			code: 'const foo = `\\\\\\uD834FOO`;',
			output: 'const foo = `\\\\\\ud834FOO`;',
		},
		{
			code: 'const foo = `FOO\\\\\\uD834`;',
			output: 'const foo = `FOO\\\\\\ud834`;',
		},
		{
			code: 'const foo = `FOO \\\\\\uD834`;',
			output: 'const foo = `FOO \\\\\\ud834`;',
		},
		// TODO: This is not safe, it will be broken if `tagged` uses `arguments[0].raw`
		// #2341
		{
			code: 'const foo = tagged`\\uaAaA`;',
			output: 'const foo = tagged`\\uaaaa`;',
		},
		{
			code: 'const foo = `\\uaAaA```;',
			output: 'const foo = `\\uaaaa```;',
		},

		// Mixed cases
		{
			code: 'const foo = `\\xaA`;',
			output: 'const foo = `\\xaa`;',
		},
		{
			code: 'const foo = `\\uaAaA`;',
			output: 'const foo = `\\uaaaa`;',
		},
		{
			code: 'const foo = `\\u{aAaA}`;',
			output: 'const foo = `\\u{aaaa}`;',
		},

		// Many
		{
			code: 'const foo = `\\xAab\\xaab\\xaAb\\xAA${foo}\\uAaAab\\uaaaab\\uAAAAb\\u{AaAa}${foo}\\u{aaaa}b\\u{AAAA}`;',
			output: 'const foo = `\\xaab\\xaab\\xaab\\xaa${foo}\\uaaaab\\uaaaab\\uaaaab\\u{aaaa}${foo}\\u{aaaa}b\\u{aaaa}`;',
			errors: Array.from({length: 3}, () => ({messageId: MESSAGE_ID_LOWERCASE})),
		},

		// Literal regex
		{
			code: String.raw`const foo = /\xA9/;`,
			output: String.raw`const foo = /\xa9/;`,
		},
		{
			code: String.raw`const foo = /\uD834/`,
			output: String.raw`const foo = /\ud834/`,
		},
		{
			code: String.raw`const foo = /\u{1D306}/u`,
			output: String.raw`const foo = /\u{1d306}/u`,
		},
		{
			code: String.raw`const foo = /\cA/`,
			output: String.raw`const foo = /\ca/`,
		},
		{
			code: String.raw`const foo = /FOO\\\xA9/;`,
			output: String.raw`const foo = /FOO\\\xa9/;`,
		},
		{
			code: String.raw`const foo = /FOO\\\\\xA9/;`,
			output: String.raw`const foo = /FOO\\\\\xa9/;`,
		},

		// Mixed cases
		{
			code: String.raw`const foo = /\xaA/;`,
			output: String.raw`const foo = /\xaa/;`,
		},
		{
			code: String.raw`const foo = /\uaAaA/;`,
			output: String.raw`const foo = /\uaaaa/;`,
		},
		{
			code: String.raw`const foo = /\u{aAaA}/;`,
			output: String.raw`const foo = /\u{aaaa}/;`,
		},

		// Many
		{
			code: String.raw`const foo = /\xAab\xaAb\xaab\xAAb\uAaAab\uaaaab\uAAAAb\u{AaAa}b\u{aaaa}b\u{AAAA}b\cA/;`,
			output: String.raw`const foo = /\xaab\xaab\xaab\xaab\uaaaab\uaaaab\uaaaab\u{aaaa}b\u{aaaa}b\u{aaaa}b\ca/;`,
		},

		// RegExp
		{
			code: String.raw`const foo = new RegExp("/\xA9")`,
			output: String.raw`const foo = new RegExp("/\xa9")`,
		},
		{
			code: String.raw`const foo = new RegExp("/\uD834/")`,
			output: String.raw`const foo = new RegExp("/\ud834/")`,
		},
		{
			code: String.raw`const foo = new RegExp("/\u{1D306}/", "u")`,
			output: String.raw`const foo = new RegExp("/\u{1d306}/", "u")`,
		},
	].map(item => ({errors: [{messageId: MESSAGE_ID_LOWERCASE}], ...item, options: ['lowercase']})),
});
