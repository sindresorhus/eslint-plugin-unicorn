import {getTester, parsers} from './utils/test.mjs';

const {test} = getTester(import.meta);

const MESSAGE_ID = 'better-regex';

const createError = (original, optimized) => [
	{
		messageId: MESSAGE_ID,
		data: {
			original,
			optimized,
		},
	},
];

const disableSortCharacterClassesOptions = [
	{
		sortCharacterClasses: false,
	},
];

const testCase = (original, optimized) => ({
	code: original,
	output: optimized,
	errors: createError(original, optimized),
});

test({
	valid: [
		// Literal regex
		String.raw`const foo = /\d/`,
		String.raw`const foo = /\W/i`,
		String.raw`const foo = /\w/gi`,
		'const foo = /[a-z]/gi',
		String.raw`const foo = /\d*?/gi`,

		// Should not crash ESLint (#446 and #448)
		String.raw`/\{\{verificationUrl\}\}/gu`,
		String.raw`/^test-(?<name>[a-zA-Z-\d]+)$/u`,
		String.raw`/[\p{Script_Extensions=Greek}--π]/v`,

		// Should not suggest wrong regex (#447)
		String.raw`/(\s|\.|@|_|-)/u`,
		String.raw`/[\s.@_-]/u`,

		// Should not remove repeating patterns too easily (#769)
		String.raw`/http:\/\/[^/]+\/pull\/commits/gi`,

		{
			code: '/[GgHhIiå.Z:a-f"0-8%A*ä]/',
			options: disableSortCharacterClassesOptions,
		},

		// `RegExp()` constructor
		String.raw`new RegExp('\d')`,
		String.raw`new RegExp('\d', 'ig')`,
		String.raw`new RegExp('\d*?')`,
		'new RegExp(\'[a-z]\', \'i\')',
		String.raw`new RegExp(/\d/)`,
		String.raw`new RegExp(/\d/gi)`,
		String.raw`new RegExp(/\d/, 'ig')`,
		String.raw`new RegExp(/\d*?/)`,
		'new RegExp(/[a-z]/, \'i\')',
		// Not `new`
		'RegExp("[0-9]")',
		// Not `RegExp`
		'new Foo("[0-9]")',
		// `callee` is not `Identifier`
		'new foo.RegExp("[0-9]")',
		// `pattern` is not `Literal`
		'new RegExp(foo)',
		// `patter` is not `string`
		'new RegExp(0)',
		// No arguments
		'new RegExp()',

		// #472
		'/[ ;-]/g',

		// #994
		String.raw`/\s?\s?/`, // https://github.com/DmitrySoshnikov/regexp-tree/issues/216#issuecomment-762073297
		String.raw`/\s{0,2}/`,
	],
	invalid: [
		// Literal regex
		{
			code: String.raw`const foo = /\w/ig`,
			errors: createError(String.raw`/\w/ig`, String.raw`/\w/gi`),
			output: String.raw`const foo = /\w/gi`,
		},
		{
			code: 'const foo = /[0-9]/',
			errors: createError('/[0-9]/', String.raw`/\d/`),
			output: String.raw`const foo = /\d/`,
		},
		{
			code: 'const foo = /[0-9]/ig',
			errors: createError('/[0-9]/ig', String.raw`/\d/gi`),
			output: String.raw`const foo = /\d/gi`,
		},
		{
			code: 'const foo = /[^0-9]/',
			errors: createError('/[^0-9]/', String.raw`/\D/`),
			output: String.raw`const foo = /\D/`,
		},
		{
			code: 'const foo = /[A-Za-z0-9_]/',
			errors: createError('/[A-Za-z0-9_]/', String.raw`/\w/`),
			output: String.raw`const foo = /\w/`,
		},
		{
			code: String.raw`const foo = /[A-Za-z\d_]/`,
			errors: createError(String.raw`/[A-Za-z\d_]/`, String.raw`/\w/`),
			output: String.raw`const foo = /\w/`,
		},
		{
			code: 'const foo = /[a-zA-Z0-9_]/',
			errors: createError('/[a-zA-Z0-9_]/', String.raw`/\w/`),
			output: String.raw`const foo = /\w/`,
		},
		{
			code: String.raw`const foo = /[a-zA-Z\d_]/`,
			errors: createError(String.raw`/[a-zA-Z\d_]/`, String.raw`/\w/`),
			output: String.raw`const foo = /\w/`,
		},
		{
			code: String.raw`const foo = /[A-Za-z0-9_]+[0-9]?\.[A-Za-z0-9_]*/`,
			errors: createError(String.raw`/[A-Za-z0-9_]+[0-9]?\.[A-Za-z0-9_]*/`, String.raw`/\w+\d?\.\w*/`),
			output: String.raw`const foo = /\w+\d?\.\w*/`,
		},
		{
			code: 'const foo = /[a-z0-9_]/i',
			errors: createError('/[a-z0-9_]/i', String.raw`/\w/i`),
			output: String.raw`const foo = /\w/i`,
		},
		{
			code: String.raw`const foo = /[a-z\d_]/i`,
			errors: createError(String.raw`/[a-z\d_]/i`, String.raw`/\w/i`),
			output: String.raw`const foo = /\w/i`,
		},
		{
			code: 'const foo = /[^A-Za-z0-9_]/',
			errors: createError('/[^A-Za-z0-9_]/', String.raw`/\W/`),
			output: String.raw`const foo = /\W/`,
		},
		{
			code: String.raw`const foo = /[^A-Za-z\d_]/`,
			errors: createError(String.raw`/[^A-Za-z\d_]/`, String.raw`/\W/`),
			output: String.raw`const foo = /\W/`,
		},
		{
			code: 'const foo = /[^a-z0-9_]/i',
			errors: createError('/[^a-z0-9_]/i', String.raw`/\W/i`),
			output: String.raw`const foo = /\W/i`,
		},
		{
			code: String.raw`const foo = /[^a-z\d_]/i`,
			errors: createError(String.raw`/[^a-z\d_]/i`, String.raw`/\W/i`),
			output: String.raw`const foo = /\W/i`,
		},
		{
			code: String.raw`const foo = /[^a-z\d_]/ig`,
			errors: createError(String.raw`/[^a-z\d_]/ig`, String.raw`/\W/gi`),
			output: String.raw`const foo = /\W/gi`,
		},
		{
			code: String.raw`const foo = /[^\d_a-z]/ig`,
			errors: createError(String.raw`/[^\d_a-z]/ig`, String.raw`/\W/gi`),
			output: String.raw`const foo = /\W/gi`,
		},
		{
			code: 'const foo = /[a-z0-9_]/',
			errors: createError('/[a-z0-9_]/', String.raw`/[\d_a-z]/`),
			output: String.raw`const foo = /[\d_a-z]/`,
		},
		{
			code: 'const foo = /^by @([a-zA-Z0-9-]+)/',
			errors: createError('/^by @([a-zA-Z0-9-]+)/', String.raw`/^by @([\dA-Za-z-]+)/`),
			output: String.raw`const foo = /^by @([\dA-Za-z-]+)/`,
		},
		{
			code: '/[GgHhIiå.Z:a-f"0-8%A*ä]/',
			errors: createError('/[GgHhIiå.Z:a-f"0-8%A*ä]/', '/["%*.0-8:AG-IZa-iäå]/'),
			output: '/["%*.0-8:AG-IZa-iäå]/',
		},
		// Should still use shorthand when disabling sort character classes
		{
			code: '/[a0-9b]/',
			options: disableSortCharacterClassesOptions,
			errors: createError('/[a0-9b]/', String.raw`/[a\db]/`),
			output: String.raw`/[a\db]/`,
		},

		// `RegExp()` constructor
		{
			code: 'const foo = new RegExp(\'[0-9]\')',
			errors: createError('[0-9]', String.raw`\d`),
			output: String.raw`const foo = new RegExp('\\d')`,
		},
		{
			code: 'const foo = new RegExp("[0-9]")',
			errors: createError('[0-9]', String.raw`\d`),
			output: String.raw`const foo = new RegExp("\\d")`,
		},
		{
			code: String.raw`const foo = new RegExp('\'[0-9]\'')`,
			errors: createError('\'[0-9]\'', String.raw`'\d'`),
			output: String.raw`const foo = new RegExp('\'\\d\'')`,
		},
		{
			code: 'const foo = new RegExp("\'[0-9]\'")',
			errors: createError('\'[0-9]\'', String.raw`'\d'`),
			output: String.raw`const foo = new RegExp("'\\d'")`,
		},
		{
			code: 'const foo = new RegExp(\'[0-9]\', \'ig\')',
			errors: createError('[0-9]', String.raw`\d`),
			output: String.raw`const foo = new RegExp('\\d', 'ig')`,
		},
		{
			code: 'const foo = new RegExp(/[0-9]/, \'ig\')',
			errors: createError('/[0-9]/', String.raw`/\d/`),
			output: String.raw`const foo = new RegExp(/\d/, 'ig')`,
		},
		{
			code: 'const foo = new RegExp(/^[^*]*[*]?$/)',
			errors: createError('/^[^*]*[*]?$/', String.raw`/^[^*]*\*?$/`),
			output: String.raw`const foo = new RegExp(/^[^*]*\*?$/)`,
		},
		// No `flags`
		{
			code: 'const foo = new RegExp(/[0-9]/)',
			errors: createError('/[0-9]/', String.raw`/\d/`),
			output: String.raw`const foo = new RegExp(/\d/)`,
		},
		// `flags` not `Literal`
		{
			code: 'const foo = new RegExp(/[0-9]/, ig)',
			errors: createError('/[0-9]/', String.raw`/\d/`),
			output: String.raw`const foo = new RegExp(/\d/, ig)`,
		},
		// `flags` not `string`
		{
			code: 'const foo = new RegExp(/[0-9]/, 0)',
			errors: createError('/[0-9]/', String.raw`/\d/`),
			output: String.raw`const foo = new RegExp(/\d/, 0)`,
		},
		// `\s` rewrite
		testCase(
			String.raw`/[ \f\n\r\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/`,
			String.raw`/\s+/`,
		),
		// #499
		{
			code: String.raw`/^[a-z][a-z0-9\-]{5,29}$/`,
			errors: createError(String.raw`/^[a-z][a-z0-9\-]{5,29}$/`, String.raw`/^[a-z][\da-z\-]{5,29}$/`),
			output: String.raw`/^[a-z][\da-z\-]{5,29}$/`,
		},
		// #477
		testCase(
			String.raw`/[ \n\t\r\]]/g`,
			String.raw`/[\t\n\r \]]/g`,
		),
		testCase(
			String.raw`/[ \n\t\r\f"#'()/;[\\\]{}]/g`,
			String.raw`/[\t\n\f\r "#'()/;[\\\]{}]/g`,
		),
		testCase(
			String.raw`/[ \n\t\r\f(){}:;@!'"\\\][#]|\/(?=\*)/g`,
			String.raw`/[\t\n\f\r !"#'():;@[\\\]{}]|\/(?=\*)/g`,
		),
		// #994
		testCase(
			String.raw`/\s?\s?\s?/`,
			String.raw`/\s{0,3}/`,
		),
		// Actual message
		{
			code: '/[0-9]/',
			output: String.raw`/\d/`,
			errors: [
				{
					message: String.raw`/[0-9]/ can be optimized to /\d/.`,
				},
			],
		},

		{
			code: '/(/',
			errors: [
				{
					message: 'Problem parsing /(/: \n\n/(/\n  ^\nUnexpected token: "/" at 1:2.',
				},
			],
			languageOptions: {
				parser: parsers.typescript,
			},
		},

		// Not fixable
		{
			code: 'const foo = /[0-9]/.toString',
			errors: createError('/[0-9]/', String.raw`/\d/`),
		},
		{
			code: 'const foo = /[0-9]/.source',
			errors: createError('/[0-9]/', String.raw`/\d/`),
		},
	],
});

test.snapshot({
	valid: [],
	invalid: [
		// Invalid RegExp
		'/(?!a)+/g',
	],
});
