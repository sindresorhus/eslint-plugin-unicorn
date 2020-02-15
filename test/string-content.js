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
		suggest: '🦄'
	},
	awesome: {
		suggest: '😎'
	},
	quote: {suggest: '\'"'}
};

const createError = (match, suggest) => [
	{
		message: `Prefer \`${suggest}\` over \`${match}\`.`
	}
];

ruleTester.run('string-content', rule, {
	valid: [
		// `Literal` string
		'const foo = \'🦄\';',
		// Not `a string`
		'const foo = 0;',
		// Not `Literal`
		'const foo = bar;',
		// Disable default patterns
		{
			code: 'const foo = \'\\\'\'',
			options: [{patterns: {'\'': false}}]
		},
		// `TemplateLiteral`
		'const foo = `🦄`'
	],
	invalid: [
		// `Literal` string
		{
			code: 'const foo = \'\\\'\'',
			output: 'const foo = \'’\'',
			errors: createError('\'', '’')
		},
		// Custom patterns
		{
			code: 'const foo = \'unicorn\'',
			output: 'const foo = \'🦄\'',
			options: [{patterns}],
			errors: createError('unicorn', '🦄')
		},
		// Custom patterns should not override default patterns
		{
			code: 'const foo = \'\\\'\'',
			output: 'const foo = \'’\'',
			options: [{patterns}],
			errors: createError('\'', '’')
		},
		// Escape single quote
		{
			code: 'const foo = \'quote\'',
			output: 'const foo = \'\\\'"\'',
			options: [{patterns}],
			errors: createError('quote', '\'"')
		},
		// Escape double quote
		{
			code: 'const foo = "quote"',
			output: 'const foo = "\'\\""',
			options: [{patterns}],
			errors: createError('quote', '\'"')
		},
		// Not fix
		{
			code: 'const foo = "unicorn"',
			options: [{patterns: {unicorn: {...patterns.unicorn, fix: false}}}],
			errors: createError('unicorn', '🦄')
		},
		// Conflict patterns
		{
			code: 'const foo = "a"',
			output: 'const foo = "A"',
			options: [{patterns: {a: 'A', A: 'a'}}],
			errors: createError('a', 'A')
		},
		{
			code: 'const foo = "A"',
			output: 'const foo = "a"',
			options: [{patterns: {a: 'A', A: 'a'}}],
			errors: createError('A', 'a')
		},
		{
			code: 'const foo = "aA"',
			output: 'const foo = "AA"',
			options: [{patterns: {a: 'A', A: 'a'}}],
			errors: createError('a', 'A')
		},
		{
			code: 'const foo = "aA"',
			output: 'const foo = "aa"',
			options: [{patterns: {A: 'a', a: 'A'}}],
			errors: createError('A', 'a')
		},

		// Escaped pattern
		{
			code: 'const foo = "foo.bar"',
			output: 'const foo = "_______"',
			options: [{patterns: {'.': '_'}}], // <- not escaped
			errors: createError('.', '_')
		},
		{
			code: 'const foo = "foo.bar"',
			output: 'const foo = "foo_bar"',
			options: [{patterns: {'\\.': '_'}}], // <- escaped
			errors: createError('\\.', '_')
		},

		// Custom message
		{
			code: 'const foo = "foo"',
			output: 'const foo = "bar"',
			options: [{patterns: {foo: {suggest: 'bar', message: '`bar` is better than `foo`.'}}}],
			errors: [{message: '`bar` is better than `foo`.'}]
		},

		/* eslint-disable no-template-curly-in-string */
		// `TemplateLiteral`
		{
			code: 'const foo = `\'`',
			output: 'const foo = `’`',
			errors: createError('\'', '’')
		},
		// `TemplateElement` position
		{
			code: 'const foo = `\'${foo}\'${foo}\'`',
			output: 'const foo = `’${foo}’${foo}’`',
			errors: Array.from({length: 3}).fill(createError('\'', '’'))
		},
		// Escape
		{
			code: 'const foo = `foo`',
			output: 'const foo = `bar\\`bar`',
			options: [{patterns: {foo: 'bar`bar'}}],
			errors: createError('foo', 'bar`bar')
		},
		{
			code: 'const foo = `foo`',
			output: 'const foo = `\\${bar}`',
			options: [{patterns: {foo: '${bar}'}}],
			errors: createError('foo', '${bar}')
		}
		/* eslint-enable no-template-curly-in-string */
	]
});
