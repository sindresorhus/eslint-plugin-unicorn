import test from 'ava';
import {outdent} from 'outdent';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-starts-ends-with';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

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
	/^foo/i
];

const invalidRegex = [
	/^foo/,
	/foo$/,
	/^!/,
	/!$/,
	/^ /,
	/ $/
];

ruleTester.run('prefer-starts-ends-with', rule, {
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

		...validRegex.map(re => `${re}.test(bar)`),
		...validRegex.map(re => `bar.match(${re})`)
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
		},

		...invalidRegex.map(re => {
			const code = `bar.match(${re})`;
			const messageId = re.source.startsWith('^') ? MESSAGE_STARTS_WITH : MESSAGE_ENDS_WITH;
			return {
				code,
				output: code,
				errors: [{messageId}]
			};
		})
	]
});
