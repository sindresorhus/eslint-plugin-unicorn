import test from 'ava';
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
			const code = `${re}.test(bar)`;
			const messageId = re.source.startsWith('^') ? MESSAGE_STARTS_WITH : MESSAGE_ENDS_WITH;
			return {
				code,
				output: code,
				errors: [{messageId}]
			};
		}),
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
