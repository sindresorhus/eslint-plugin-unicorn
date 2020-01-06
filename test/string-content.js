import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/string-content';

const fromEntries = Object.fromEntries || (entries => entries.reduce((object, [key, value]) => {
	object[key] = value;
	return object;
}, {}));

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const patterns = {
	unicorn: {
		suggest: '🦄'
	},
	awesome: {
		suggest: '😎'
	},
	quote: {suggest: '\'"'}
};

// TODO: [engine >= 12] use Object.fromEntries
const lowerToUpperPatterns = fromEntries(Array.from({length: 26}, (_, index) => {
	const match = String.fromCharCode('a'.charCodeAt(0) + index);
	const suggest = String.fromCharCode('A'.charCodeAt(0) + index);
	return [
		match,
		{suggest}
	];
}));
const lowerToUpperMessages = Array.from({length: 26}, (_, index) => {
	const match = String.fromCharCode('a'.charCodeAt(0) + index);
	const suggest = String.fromCharCode('A'.charCodeAt(0) + index);
	const message = `Prefer \`${suggest}\` over \`${match}\`.`;
	return {message};
});

ruleTester.run('string-content', rule, {
	valid: [
		'const foo = \'🦄\'',
		// Not a string
		'const foo = 0',

		// Disable default patterns
		{
			code: 'const foo = \'\\\'\'',
			options: [{patterns: {'\'': false}}]
		}
	],
	invalid: [
		{
			code: 'const foo = \'\\\'\'',
			output: 'const foo = \'’\'',
			errors: [{message: 'Prefer `’` over `\'`.'}]
		},
		// Custom patterns
		{
			code: 'const foo = \'unicorn\'',
			output: 'const foo = \'🦄\'',
			errors: [{message: 'Prefer `🦄` over `unicorn`.'}],
			options: [{patterns}]
		},
		// Custom patterns should not override default patterns
		{
			code: 'const foo = \'unicorn\\\'\'',
			output: 'const foo = \'🦄’\'',
			errors: [{message: 'Prefer `’` over `\'`.'}, {message: 'Prefer `🦄` over `unicorn`.'}],
			options: [{patterns}]
		},
		// Escape single quote
		{
			code: 'const foo = \'quote\'',
			output: 'const foo = \'\\\'"\'',
			errors: [{message: 'Prefer `\'"` over `quote`.'}],
			options: [{patterns}]
		},
		// Escape double quote
		{
			code: 'const foo = "quote"',
			output: 'const foo = "\'\\""',
			errors: [{message: 'Prefer `\'"` over `quote`.'}],
			options: [{patterns}]
		},
		// Not fix
		{
			code: 'const foo = \'unicorn\'',
			errors: [{message: 'Prefer `🦄` over `unicorn`.'}],
			options: [{patterns: {unicorn: {...patterns.unicorn, fix: false}}}]
		},
		// Multi patterns
		{
			code: 'const foo = \'unicorn is awesome\'',
			output: 'const foo = \'🦄 is 😎\'',
			errors: [{message: 'Prefer `🦄` over `unicorn`.'}, {message: 'Prefer `😎` over `awesome`.'}],
			options: [{patterns}]
		},
		// Multi patterns, Not fix `awesome`
		{
			code: 'const foo = \'unicorn is awesome\'',
			output: 'const foo = \'🦄 is awesome\'',
			errors: [{message: 'Prefer `🦄` over `unicorn`.'}, {message: 'Prefer `😎` over `awesome`.'}],
			options: [{patterns: {
				unicorn: patterns.unicorn,
				awesome: {...patterns.awesome, fix: false}
			}}]
		},
		// Conflict patterns
		{
			code: 'const foo = \'a\'',
			output: 'const foo = \'A\'',
			errors: [{message: 'Prefer `A` over `a`.'}],
			options: [{patterns: {a: 'A', A: 'a'}}]
		},
		{
			code: 'const foo = \'A\'',
			output: 'const foo = \'a\'',
			errors: [{message: 'Prefer `a` over `A`.'}],
			options: [{patterns: {a: 'A', A: 'a'}}]
		},
		{
			code: 'const foo = \'aA\'',
			output: 'const foo = \'aa\'',
			errors: [{message: 'Prefer `A` over `a`.'}, {message: 'Prefer `a` over `A`.'}],
			options: [{patterns: {a: 'A', A: 'a'}}]
		},
		{
			code: 'const foo = \'aA\'',
			output: 'const foo = \'AA\'',
			errors: [{message: 'Prefer `a` over `A`.'}, {message: 'Prefer `A` over `a`.'}],
			options: [{patterns: {A: 'a', a: 'A'}}] // <- patterns order changed
		},

		// Escaped pattern
		{
			code: 'const foo = \'foo.bar\'',
			output: 'const foo = \'_______\'',
			errors: [{message: 'Prefer `_` over `.`.'}],
			options: [{patterns: {'.': '_'}}] // <- not escaped
		},
		{
			code: 'const foo = \'foo.bar\'',
			output: 'const foo = \'foo_bar\'',
			errors: [{message: 'Prefer `_` over `\\.`.'}],
			options: [{patterns: {'\\.': '_'}}] // <- escaped
		},

		// Custom message
		{
			code: 'const foo = \'foo\'',
			output: 'const foo = \'bar\'',
			errors: [{message: '`bar` is better than `foo`.'}],
			options: [{patterns: {foo: {suggest: 'bar', message: '`bar` is better than `foo`.'}}}]
		},

		// Many patterns
		{
			code: 'const foo = \'abcdefghijklmnopqrstuvwxyz\'',
			output: 'const foo = \'ABCDEFGHIJKLMNOPQRSTUVWXYZ\'',
			errors: lowerToUpperMessages,
			options: [{patterns: lowerToUpperPatterns}]
		}
	]
});
