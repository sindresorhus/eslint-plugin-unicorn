import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const MESSAGE_STARTS_WITH = 'prefer-starts-with';
const MESSAGE_ENDS_WITH = 'prefer-ends-with';
const FIX_TYPE_STRING_CASTING = 'useStringCasting';
const FIX_TYPE_OPTIONAL_CHAINING = 'useOptionalChaining';
const FIX_TYPE_NULLISH_COALESCING = 'useNullishCoalescing';

const validRegex = [
	/foo/,
	/^foo$/,
	/^foo+/,
	/foo+$/,
	/^[,af]/,
	/[,af]$/,
	/^\w/,
	/\w$/,
	/^foo./,
	/foo.$/,
	/\^foo/,
	/^foo/i,
	/^foo/m,
	/^foo/im,
	/^A|B/,
	/A|B$/,
];

const invalidRegex = [
	/^foo/,
	/foo$/,
	/^!/,
	/!$/,
	/^ /,
	/ $/,
];

test({
	valid: [
		'foo.startsWith("bar")',
		'foo.endsWith("bar")',

		// Ensure it doesn't crash:
		'reject(new Error("foo"))',
		'"".test()',
		'test()',
		'test.test()',
		'startWith("bar")',
		'foo()()',

		// `prefer-regexp-test` cases
		'if (foo.match(/^foo/)) {}',
		'if (/^foo/.exec(foo)) {}',

		...validRegex.map(re => `${re}.test(bar)`),
	],
	invalid: [
		...invalidRegex.map(re => {
			let messageId = MESSAGE_STARTS_WITH;
			let method = 'startsWith';
			let string = re.source;

			if (string.startsWith('^')) {
				string = string.slice(1);
			} else {
				messageId = MESSAGE_ENDS_WITH;
				method = 'endsWith';
				string = string.slice(0, -1);
			}

			return {
				code: `${re}.test(bar)`,
				output: `bar.${method}('${string}')`,
				errors: [{
					messageId,
					suggestions: [
						{
							messageId: FIX_TYPE_STRING_CASTING,
							output: `String(bar).${method}('${string}')`,
						},
						{
							messageId: FIX_TYPE_OPTIONAL_CHAINING,
							output: `bar?.${method}('${string}')`,
						},
						{
							messageId: FIX_TYPE_NULLISH_COALESCING,
							output: `(bar ?? '').${method}('${string}')`,
						},
					],
				}],
			};
		}),
		// String in variable. Don't autofix known, non-strings which don't have a startsWith/endsWith function.
		{
			code: 'const foo = {}; /^abc/.test(foo);',
			errors: [{messageId: MESSAGE_STARTS_WITH, suggestions: 3}],
		},
		{
			code: 'const foo = 123; /^abc/.test(foo);',
			errors: [{messageId: MESSAGE_STARTS_WITH, suggestions: 3}],
		},
		{
			code: 'const foo = "hello"; /^abc/.test(foo);',
			output: 'const foo = "hello"; foo.startsWith(\'abc\');',
			errors: [{messageId: MESSAGE_STARTS_WITH}],
		},
		// Parenthesized
		{
			code: '/^b/.test((a))',
			output: '(a).startsWith(\'b\')',
			errors: [{
				messageId: MESSAGE_STARTS_WITH,
				suggestions: [
					{
						messageId: FIX_TYPE_STRING_CASTING,
						output: 'String((a)).startsWith(\'b\')',
					},
					{
						messageId: FIX_TYPE_OPTIONAL_CHAINING,
						output: '(a)?.startsWith(\'b\')',
					},
					{
						messageId: FIX_TYPE_NULLISH_COALESCING,
						output: '((a) ?? \'\').startsWith(\'b\')',
					},
				],
			}],
		},
		{
			code: '(/^b/).test((a))',
			output: '((a)).startsWith(\'b\')',
			errors: [{
				messageId: MESSAGE_STARTS_WITH,
				suggestions: [
					{
						messageId: FIX_TYPE_STRING_CASTING,
						output: '(String((a))).startsWith(\'b\')',
					},
					{
						messageId: FIX_TYPE_OPTIONAL_CHAINING,
						output: '((a))?.startsWith(\'b\')',
					},
					{
						messageId: FIX_TYPE_NULLISH_COALESCING,
						output: '((a) ?? \'\').startsWith(\'b\')',
					},
				],
			}],
		},
		{
			code: 'const fn = async () => /^b/.test(await foo)',
			output: 'const fn = async () => (await foo).startsWith(\'b\')',
			errors: [{
				messageId: MESSAGE_STARTS_WITH,
				suggestions: [
					{
						messageId: FIX_TYPE_STRING_CASTING,
						output: 'const fn = async () => String(await foo).startsWith(\'b\')',
					},
					{
						messageId: FIX_TYPE_OPTIONAL_CHAINING,
						output: 'const fn = async () => (await foo)?.startsWith(\'b\')',
					},
					{
						messageId: FIX_TYPE_NULLISH_COALESCING,
						output: 'const fn = async () => ((await foo) ?? \'\').startsWith(\'b\')',
					},
				],
			}],
		},
		{
			code: 'const fn = async () => (/^b/).test(await foo)',
			output: 'const fn = async () => (await foo).startsWith(\'b\')',
			errors: [{
				messageId: MESSAGE_STARTS_WITH,
				suggestions: [
					{
						messageId: FIX_TYPE_STRING_CASTING,
						output: 'const fn = async () => (String(await foo)).startsWith(\'b\')',
					},
					{
						messageId: FIX_TYPE_OPTIONAL_CHAINING,
						output: 'const fn = async () => (await foo)?.startsWith(\'b\')',
					},
					{
						messageId: FIX_TYPE_NULLISH_COALESCING,
						output: 'const fn = async () => ((await foo) ?? \'\').startsWith(\'b\')',
					},
				],
			}],
		},
	],
});

test.snapshot({
	valid: [],
	invalid: [
		'/^a/.test("string")',
		'/^a/.test((0, "string"))',
		'async function a() {return /^a/.test(await foo())}',
		'/^a/.test(foo + bar)',
		'/^a/.test(foo || bar)',
		'/^a/.test(new SomeString)',
		'/^a/.test(new (SomeString))',
		'/^a/.test(new SomeString())',
		'/^a/.test(new new SomeClassReturnsAStringSubClass())',
		'/^a/.test(new SomeString(/* comment */))',
		'/^a/.test(new SomeString("string"))',
		'/^a/.test(foo.bar)',
		'/^a/.test(foo.bar())',
		'/^a/.test(foo?.bar)',
		'/^a/.test(foo?.bar())',
		'/^a/.test(`string`)',
		'/^a/.test(tagged`string`)',
		'(/^a/).test((0, "string"))',
		'/^a/.test(true ? a : b)',
		'/a$/.test(a ??= b)',
		'/^a/.test(a || b)',
		'/^a/.test(a && b)',
		'/^a/u.test("string")',
		'/^a/v.test("string")',
		// eslint-disable-next-line no-template-curly-in-string
		'/a$/.test(`${unknown}`)',
		'/a$/.test(String(unknown))',
		outdent`
			/* 1 */
			(
				/* 2 */
				(
					/* 3 */
					/^a/
					/* 4 */
				)
				/* 5 */
			)
			/* 6 */
			. /* 7 */ test /* 8 */ (
				/* 9 */
				(
					/* 10 */
					(
						/* 11 */
						a
						/* 12 */
					)
					/* 13 */
				)
				/* 14 */
			) /* 15 */
		`,
	],
});
