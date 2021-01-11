import {outdent} from 'outdent';
import {test} from './utils/test';

const MESSAGE_STARTS_WITH = 'prefer-starts-with';
const MESSAGE_ENDS_WITH = 'prefer-ends-with';

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
				errors: [{messageId}]
			};
		}),
		// Parenthesized
		{
			code: '/^b/.test(("a"))',
			output: '("a").startsWith((\'b\'))',
			errors: [{messageId: MESSAGE_STARTS_WITH}]
		},
		{
			code: '(/^b/).test(("a"))',
			output: '("a").startsWith((\'b\'))',
			errors: [{messageId: MESSAGE_STARTS_WITH}]
		},
		{
			code: 'const fn = async () => /^b/.test(await foo)',
			output: 'const fn = async () => (await foo).startsWith(\'b\')',
			errors: [{messageId: MESSAGE_STARTS_WITH}]
		},
		{
			code: 'const fn = async () => (/^b/).test(await foo)',
			output: 'const fn = async () => (await foo).startsWith(\'b\')',
			errors: [{messageId: MESSAGE_STARTS_WITH}]
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
			errors: [{messageId: MESSAGE_STARTS_WITH}]
		}
	]
});

test.visualize([
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
]);
