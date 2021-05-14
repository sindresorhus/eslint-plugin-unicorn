import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const MESSAGE_STARTS_WITH = 'prefer-starts-with';
const MESSAGE_ENDS_WITH = 'prefer-ends-with';
const SUGGEST_STRING_CAST = 'suggest-string-cast';
const SUGGEST_OPTIONAL_CHAINING = 'suggest-optional-chaining';
const SUGGEST_NULLISH_COALESCING = 'suggest-nullish-coalescing';

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
	/A|B$/
];

const invalidRegex = [
	/^foo/,
	/foo$/,
	/^!/,
	/!$/,
	/^ /,
	/ $/
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

		...validRegex.map(re => `${re}.test(bar)`)
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
							messageId: SUGGEST_STRING_CAST,
							output: `String(bar).${method}('${string}')`
						},
						{
							messageId: SUGGEST_OPTIONAL_CHAINING,
							output: `bar?.${method}('${string}')`
						},
						{
							messageId: SUGGEST_NULLISH_COALESCING,
							output: `(bar ?? '').${method}('${string}')`
						}
					]
				}]
			};
		}),
		// Parenthesized
		{
			code: '/^b/.test(("a"))',
			output: '("a").startsWith((\'b\'))',
			errors: [{
				messageId: MESSAGE_STARTS_WITH,
				suggestions: [
					{
						messageId: SUGGEST_STRING_CAST,
						output: 'String("a").startsWith((\'b\'))'
					},
					{
						messageId: SUGGEST_OPTIONAL_CHAINING,
						output: '("a")?.startsWith((\'b\'))'
					},
					{
						messageId: SUGGEST_NULLISH_COALESCING,
						output: '(("a") ?? \'\').startsWith((\'b\'))'
					}
				]
			}]
		},
		{
			code: '(/^b/).test(("a"))',
			output: '("a").startsWith((\'b\'))',
			errors: [{
				messageId: MESSAGE_STARTS_WITH,
				suggestions: [
					{
						messageId: SUGGEST_STRING_CAST,
						output: '(String("a")).startsWith((\'b\'))' // TODO: remove extra parens around String()
					},
					{
						messageId: SUGGEST_OPTIONAL_CHAINING,
						output: '("a")?.startsWith((\'b\'))'
					},
					{
						messageId: SUGGEST_NULLISH_COALESCING,
						output: '("a" ?? \'\').startsWith((\'b\'))'
					}
				]
			}]
		},
		{
			code: 'const fn = async () => /^b/.test(await foo)',
			output: 'const fn = async () => (await foo).startsWith(\'b\')',
			errors: [{
				messageId: MESSAGE_STARTS_WITH,
				suggestions: [
					{
						messageId: SUGGEST_STRING_CAST,
						output: 'const fn = async () => String(await foo).startsWith(\'b\')'
					},
					{
						messageId: SUGGEST_OPTIONAL_CHAINING,
						output: 'const fn = async () => (await foo)?.startsWith(\'b\')'
					},
					{
						messageId: SUGGEST_NULLISH_COALESCING,
						output: 'const fn = async () => ((await foo) ?? \'\').startsWith(\'b\')'
					}
				]
			}]
		},
		{
			code: 'const fn = async () => (/^b/).test(await foo)',
			output: 'const fn = async () => (await foo).startsWith(\'b\')',
			errors: [{
				messageId: MESSAGE_STARTS_WITH,
				suggestions: [
					{
						messageId: SUGGEST_STRING_CAST,
						output: 'const fn = async () => (String(await foo)).startsWith(\'b\')'
					},
					{
						messageId: SUGGEST_OPTIONAL_CHAINING,
						output: 'const fn = async () => (await foo)?.startsWith(\'b\')'
					},
					{
						messageId: SUGGEST_NULLISH_COALESCING,
						output: 'const fn = async () => (await foo ?? \'\').startsWith(\'b\')'
					}
				]
			}]
		},
		// Comments
		{
			code: outdent`
				if (
					/* comment 1 */
					/^b/
					/* comment 2 */
					.test
					/* comment 3 */
					(
						/* comment 4 */
						foo
						/* comment 5 */
					)
				) {}
			`,
			output: outdent`
				if (
					/* comment 1 */
					foo
					/* comment 2 */
					.startsWith
					/* comment 3 */
					(
						/* comment 4 */
						'b'
						/* comment 5 */
					)
				) {}
			`,
			errors: [{
				messageId: MESSAGE_STARTS_WITH,
				suggestions: [
					{
						messageId: SUGGEST_STRING_CAST,
						output: outdent`
							if (
								/* comment 1 */
								String(foo)
								/* comment 2 */
								.startsWith
								/* comment 3 */
								(
									/* comment 4 */
									'b'
									/* comment 5 */
								)
							) {}
						`
					},
					{
						messageId: SUGGEST_OPTIONAL_CHAINING,
						output: outdent`
							if (
								/* comment 1 */
								foo
								/* comment 2 */
								?.startsWith
								/* comment 3 */
								(
									/* comment 4 */
									'b'
									/* comment 5 */
								)
							) {}
						`
					},
					{
						messageId: SUGGEST_NULLISH_COALESCING,
						output: outdent`
							if (
								/* comment 1 */
								(foo ?? '')
								/* comment 2 */
								.startsWith
								/* comment 3 */
								(
									/* comment 4 */
									'b'
									/* comment 5 */
								)
							) {}
						`
					}
				]
			}]
		}
	]
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
		'(/^a/).test((0, "string"))'
	]
});
