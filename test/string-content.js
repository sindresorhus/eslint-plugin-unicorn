import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/string-content';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const patterns = {
	unicorn: {
		match: 'unicorn',
		suggest: '🦄'
	},
	awesome: {
		match: 'awesome',
		suggest: '😎'
	}
};

function invalidCase({
	code,
	message,
	patterns,
	output = code
}) {
	return {
		code,
		output,
		options: [{patterns}],
		errors: [{message}]
	};
}

ruleTester.run('string-content', rule, {
	valid: [
		'const foo = \'🦄\''
	],
	invalid: [
		{
			code: 'const foo = \'unicorn\'',
			output: 'const foo = \'🦄\'',
			message: 'Prefer `🦄` over `unicorn`',
			patterns: [patterns.unicorn]
		},
		// Escape single quote
		{
			code: 'const foo = \'_\'',
			output: 'const foo = \'\\\'"\'',
			message: 'Prefer `\'"` over `_`',
			patterns: [{match: '_', suggest: '\'"'}]
		},
		// Escape double quote
		{
			code: 'const foo = "_"',
			output: 'const foo = "\'\\""',
			message: 'Prefer `\'"` over `_`',
			patterns: [{match: '_', suggest: '\'"'}]
		},
		// Not fix
		{
			code: 'const foo = \'unicorn\'',
			message: 'Prefer `🦄` over `unicorn`',
			patterns: [{...patterns.unicorn, fix: false}]
		},
		// Multi patterns
		{
			code: 'const foo = \'unicorn is awesome\'',
			output: 'const foo = \'🦄 is 😎\'',
			message: 'Prefer `🦄` over `unicorn` and `😎` over `awesome`',
			patterns: [patterns.unicorn, patterns.awesome]
		},
		// Multi patterns, Not fix `awesome`
		{
			code: 'const foo = \'unicorn is awesome\'',
			output: 'const foo = \'🦄 is awesome\'',
			message: 'Prefer `🦄` over `unicorn` and `😎` over `awesome`',
			patterns: [patterns.unicorn, {...patterns.awesome, fix: false}]
		},
		// Many patterns
		{
			code: 'const foo = \'abcdefghijklmnopqrstuvwxyz\'',
			output: 'const foo = \'ABCDEFGHIJKLMNOPQRSTUVWXYZ\'',
			message: 'Prefer `A` over `a` ,`B` over `b` … and `Z` over `z`',
			patterns: Array.from({length: 26}, (_, index) => ({
				match: String.fromCharCode('a'.charCodeAt(0) + index),
				suggest: String.fromCharCode('A'.charCodeAt(0) + index)
			}))
		}
	].map(invalidCase)
});
