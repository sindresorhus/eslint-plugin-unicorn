import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

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

		// `indexOf` — receiver not provably a string
		'foo.indexOf("bar") === 0',
		'foo.indexOf("bar") !== 0',
		'0 === foo.indexOf("bar")',
		// `indexOf` — wrong comparison
		'foo.indexOf("bar") === 1',
		'foo.indexOf("bar") > 0',
		'foo.indexOf("bar") >= 0',
		'foo.indexOf("bar") < 0',
		'"foo".indexOf("bar") === -1',
		// `indexOf` — extra arguments
		'"foo".indexOf("bar", 1) === 0',
		// `indexOf` — optional
		'foo?.indexOf("bar") === 0',
		'foo.indexOf?.("bar") === 0',
		// `indexOf` — computed
		'foo["indexOf"]("bar") === 0',
		// `indexOf` — spread
		'"foo".indexOf(..."bar") === 0',
		// `indexOf` — `new String()` returns an object, not a string primitive
		'new String("foo").indexOf("bar") === 0',
		{
			code: 'function foo(value: number) { /^foo/.test(value); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(values: string[]) { return values.indexOf("x") === 0; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(value: [string]) { return value.indexOf("x") === 0; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Value = {indexOf(searchString: string): number}; const value: Value = {} as never; { type Value = string; value.indexOf("x") === 0; }',
			languageOptions: {parser: parsers.typescript},
		},
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
		{
			code: 'const value = "hello"; /^abc/.test(value satisfies {startsWith(searchString: string): boolean});',
			output: 'const value = "hello"; (value satisfies {startsWith(searchString: string): boolean}).startsWith(\'abc\');',
			errors: [{messageId: MESSAGE_STARTS_WITH}],
			languageOptions: {parser: parsers.typescript},
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

const MESSAGE_INDEX_OF_STARTS_WITH = 'prefer-starts-with-indexOf';

// `indexOf` — provably string receivers
test({
	valid: [],
	invalid: [
		// String literal receiver
		{
			code: '"foo".indexOf("f") === 0',
			output: '"foo".startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Template literal receiver
		{
			code: '`foo`.indexOf("f") === 0',
			output: '`foo`.startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// String() call receiver
		{
			code: 'String(x).indexOf("f") === 0',
			output: 'String(x).startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Negated
		{
			code: '"foo".indexOf("f") !== 0',
			output: '!"foo".startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Reversed comparison
		{
			code: '0 === "foo".indexOf("f")',
			output: '"foo".startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Reversed negated
		{
			code: '0 !== "foo".indexOf("f")',
			output: '!"foo".startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Loose equality
		{
			code: '"foo".indexOf("f") == 0',
			output: '"foo".startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Loose inequality
		{
			code: '"foo".indexOf("f") != 0',
			output: '!"foo".startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Static string variable
		{
			code: 'const foo = "hello"; foo.indexOf("h") === 0',
			output: 'const foo = "hello"; foo.startsWith("h")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// `typeof` is always a string
		{
			code: '(typeof foo).indexOf("u") === 0',
			output: '(typeof foo).startsWith("u")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// String concatenation
		{
			code: '("a" + b).indexOf("a") === 0',
			output: '("a" + b).startsWith("a")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// TS: type annotation
		{
			code: 'function foo(bar: string) { return bar.indexOf("x") === 0; }',
			output: 'function foo(bar: string) { return bar.startsWith("x"); }',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// TS: type alias
		{
			code: 'type StringAlias = string; function foo(bar: StringAlias) { return bar.indexOf("x") === 0; }',
			output: 'type StringAlias = string; function foo(bar: StringAlias) { return bar.startsWith("x"); }',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// TS: as string
		{
			code: '(foo as string).indexOf("x") === 0',
			output: '(foo as string).startsWith("x")',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// TS: satisfies string
		{
			code: '(foo satisfies string).indexOf("x") === 0',
			output: '(foo satisfies string).startsWith("x")',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// TS: type assertion
		{
			code: '(<string>foo).indexOf("x") === 0',
			output: '(<string>foo).startsWith("x")',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// TS: non-null assertion on string variable
		{
			code: 'function foo(bar: string) { return bar!.indexOf("x") === 0; }',
			output: 'function foo(bar: string) { return (bar!).startsWith("x"); }',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Conditional expression receiver
		{
			code: '(a ? "foo" : "bar").indexOf("f") === 0',
			output: '(a ? "foo" : "bar").startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Sequence expression receiver
		{
			code: '(0, "foo").indexOf("f") === 0',
			output: '(0, "foo").startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// String.fromCharCode receiver
		{
			code: 'String.fromCharCode(65).indexOf("A") === 0',
			output: 'String.fromCharCode(65).startsWith("A")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// String.fromCodePoint receiver
		{
			code: 'String.fromCodePoint(65).indexOf("A") === 0',
			output: 'String.fromCodePoint(65).startsWith("A")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Parenthesized receiver
		{
			code: '("foo").indexOf("f") === 0',
			output: '("foo").startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// `let` variable receiver
		{
			code: 'let foo = "hello"; foo.indexOf("h") === 0',
			output: 'let foo = "hello"; foo.startsWith("h")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Non-string argument — reports but does not autofix (startsWith throws on RegExp)
		{
			code: '"foo".indexOf(/f/) === 0',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		{
			code: 'const pattern = /f/; "foo".indexOf(pattern) === 0',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		{
			code: '"foo".indexOf(new RegExp("f")) === 0',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		{
			code: '"foo".indexOf(bar) === 0',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
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
