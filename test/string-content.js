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
		/* eslint-disable no-template-curly-in-string */
		// `TemplateLiteral`
		'const foo = `🦄`',
		// Should not escape
		'const foo = `\\`\\${1}`',
		// Ignored
		`
			const foo = gql\`{
				field(input: '...')
			}\`;
		`,
		`
			const foo = styled.div\`
				background: url('...')
			\`;
		`,
		`
			const foo = html\`
				<div class='test'>...</div>
			\`;
		`,
		`
			const foo = svg\`
				<svg xmlns="http://www.w3.org/2000/svg"><path fill='#00CD9F'/></svg>
			\`;
		`
		/* eslint-enable no-template-curly-in-string */
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
		{
			code: 'const foo = \'\\\\quote\\\\\'',
			output: 'const foo = \'\\\\\\\'"\\\\\'',
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
		{
			code: 'const foo = "\\\\quote\\\\"',
			output: 'const foo = "\\\\\'\\"\\\\"',
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

		// Should not crash on multiline string
		// https://github.com/avajs/ava/blob/7f99aef61f3aed2389ca9407115ad4c9aecada92/test/assert.js#L1477
		{
			code: 'const foo = "\'\\n"',
			output: 'const foo = "’\\n"',
			options: [{patterns}],
			errors: createError('\'', '’')
		},
		// https://github.com/sindresorhus/execa/blob/df08cfb2d849adb31dc764ca3ab5f29e5b191d50/test/error.js#L20
		{
			code: 'const foo = "\'\\r"',
			output: 'const foo = "’\\r"',
			options: [{patterns}],
			errors: createError('\'', '’')
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
			code: 'const foo = `foo_foo`',
			output: 'const foo = `bar\\`bar_bar\\`bar`',
			options: [{patterns: {foo: 'bar`bar'}}],
			errors: createError('foo', 'bar`bar')
		},
		{
			code: 'const foo = `foo_foo`',
			output: 'const foo = `\\${bar}_\\${bar}`',
			options: [{patterns: {foo: '${bar}'}}],
			errors: createError('foo', '${bar}')
		},
		{
			code: 'const foo = `$foo`', // <-- not escaped $
			output: 'const foo = `\\${bar}`',
			options: [{patterns: {foo: '{bar}'}}],
			errors: createError('foo', '{bar}')
		},
		{
			code: 'const foo = `\\\\$foo`', // <-- escaped $
			output: 'const foo = `\\\\\\${bar}`',
			options: [{patterns: {foo: '{bar}'}}],
			errors: createError('foo', '{bar}')
		},
		// Not ignored tag
		{
			code: 'const foo = notIgnoredTag`\'`',
			output: 'const foo = notIgnoredTag`’`',
			errors: createError('\'', '’')
		}
		/* eslint-enable no-template-curly-in-string */
	]
});
