import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const SUGGESTION_MESSAGE_ID = 'replace';

const patterns = {
	unicorn: {
		suggest: '🦄',
	},
	awesome: {
		suggest: '😎',
	},
	quote: {suggest: '\'"'},
};

const noToYesPattern = {
	no: {
		suggest: 'yes',
	},
};

const createError = (match, suggest) => [
	{
		message: `Prefer \`${suggest}\` over \`${match}\`.`,
		suggestions: undefined,
	},
];

const createSuggestionError = (match, suggest, output) => [
	{
		message: `Prefer \`${suggest}\` over \`${match}\`.`,
		suggestions: [
			{
				messageId: SUGGESTION_MESSAGE_ID,
				data: {
					match,
					suggest,
				},
				output,
			},
		],
	},
];

test({
	testerOptions: {
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
	},
	valid: [
		'const foo = "";',
		...[
			// `Literal` string
			'const foo = \'🦄\';',
			// Not `a string`
			'const foo = 0;',
			// Not `Literal`
			'const foo = bar;',
			/* eslint-disable no-template-curly-in-string */
			// `TemplateLiteral`
			'const foo = `🦄`',
			// Should not escape
			'const foo = `\\`\\${1}`',
			// Ignored
			outdent`
				const foo = gql\`{
					field(input: 'no')
				}\`;
			`,
			outdent`
				const foo = styled.div\`
					background: url('no')
				\`;
			`,
			outdent`
				const foo = html\`
					<div class='test'>no</div>
				\`;
			`,
			outdent`
				const foo = svg\`
					<svg xmlns="http://www.w3.org/2000/svg"><text>no</text></svg>
				\`;
			`,
			/* eslint-enable no-template-curly-in-string */
		].map(code => ({
			code,
			options: [{patterns: noToYesPattern}],
		})),
	],
	invalid: [
		// `Literal` string
		{
			code: 'const foo = \'no\'',
			output: 'const foo = \'yes\'',
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},
		// Custom patterns
		{
			code: 'const foo = \'unicorn\'',
			output: 'const foo = \'🦄\'',
			options: [{patterns}],
			errors: createError('unicorn', '🦄'),
		},
		// Escape single quote
		{
			code: 'const foo = \'quote\'',
			output: String.raw`const foo = '\'"'`,
			options: [{patterns}],
			errors: createError('quote', '\'"'),
		},
		{
			code: String.raw`const foo = '\\quote\\'`,
			output: String.raw`const foo = '\\\'"\\'`,
			options: [{patterns}],
			errors: createError('quote', '\'"'),
		},
		// Escape double quote
		{
			code: 'const foo = "quote"',
			output: String.raw`const foo = "'\""`,
			options: [{patterns}],
			errors: createError('quote', '\'"'),
		},
		{
			code: String.raw`const foo = "\\quote\\"`,
			output: String.raw`const foo = "\\'\"\\"`,
			options: [{patterns}],
			errors: createError('quote', '\'"'),
		},
		// Not fix
		{
			code: 'const foo = "unicorn"',
			options: [{patterns: {unicorn: {...patterns.unicorn, fix: false}}}],
			errors: createSuggestionError(
				'unicorn',
				'🦄',
				'const foo = "🦄"',
			),
		},
		// Conflict patterns
		{
			code: 'const foo = "a"',
			output: 'const foo = "A"',
			options: [{patterns: {a: 'A', A: 'a'}}],
			errors: createError('a', 'A'),
		},
		{
			code: 'const foo = "A"',
			output: 'const foo = "a"',
			options: [{patterns: {a: 'A', A: 'a'}}],
			errors: createError('A', 'a'),
		},
		{
			code: 'const foo = "aA"',
			output: 'const foo = "AA"',
			options: [{patterns: {a: 'A', A: 'a'}}],
			errors: createError('a', 'A'),
		},
		{
			code: 'const foo = "aA"',
			output: 'const foo = "aa"',
			options: [{patterns: {A: 'a', a: 'A'}}],
			errors: createError('A', 'a'),
		},

		// Escaped pattern
		{
			code: 'const foo = "foo.bar"',
			output: 'const foo = "_______"',
			options: [{patterns: {'.': '_'}}], // <- not escaped
			errors: createError('.', '_'),
		},
		{
			code: 'const foo = "foo.bar"',
			output: 'const foo = "foo_bar"',
			options: [{patterns: {'\\.': '_'}}], // <- escaped
			errors: createError(String.raw`\.`, '_'),
		},

		// Custom message
		{
			code: 'const foo = "foo"',
			output: 'const foo = "bar"',
			options: [{patterns: {foo: {suggest: 'bar', message: '`bar` is better than `foo`.'}}}],
			errors: [{message: '`bar` is better than `foo`.'}],
		},

		// Should not crash on multiline string
		// https://github.com/avajs/ava/blob/7f99aef61f3aed2389ca9407115ad4c9aecada92/test/assert.js#L1477
		{
			code: String.raw`const foo = "no\n"`,
			output: String.raw`const foo = "yes\n"`,
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},
		// https://github.com/sindresorhus/execa/blob/df08cfb2d849adb31dc764ca3ab5f29e5b191d50/test/error.js#L20
		{
			code: String.raw`const foo = "no\r"`,
			output: String.raw`const foo = "yes\r"`,
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},

		/* eslint-disable no-template-curly-in-string */
		// `TemplateLiteral`
		{
			code: 'const foo = `no`',
			output: 'const foo = `yes`',
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},
		// `TemplateElement` position
		{
			code: 'const foo = `no${foo}no${foo}no`',
			output: 'const foo = `yes${foo}yes${foo}yes`',
			options: [{patterns: noToYesPattern}],

			// It's safe due to no mutation to `errors`
			// eslint-disable-next-line unicorn/no-array-fill-with-reference-type
			errors: Array.from({length: 3}).fill(createError('no', 'yes')[0]),
		},
		// Escape
		{
			code: 'const foo = `foo_foo`',
			output: 'const foo = `bar\\`bar_bar\\`bar`',
			options: [{patterns: {foo: 'bar`bar'}}],
			errors: createError('foo', 'bar`bar'),
		},
		{
			code: 'const foo = `foo_foo`',
			output: 'const foo = `\\${bar}_\\${bar}`',
			options: [{patterns: {foo: '${bar}'}}],
			errors: createError('foo', '${bar}'),
		},
		{
			code: 'const foo = `$foo`', // <-- not escaped $
			output: 'const foo = `\\${bar}`',
			options: [{patterns: {foo: '{bar}'}}],
			errors: createError('foo', '{bar}'),
		},
		{
			code: 'const foo = `\\\\$foo`', // <-- escaped $
			output: 'const foo = `\\\\\\${bar}`',
			options: [{patterns: {foo: '{bar}'}}],
			errors: createError('foo', '{bar}'),
		},
		// Not ignored tag
		{
			code: 'const foo = notIgnoredTag`no`',
			output: 'const foo = notIgnoredTag`yes`',
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},

		// Object is not `Identifier`
		{
			code: outdent`
				const foo = 'styled'[div]\`
					background: url('no')
				\`;
			`,
			output: outdent`
				const foo = 'styled'[div]\`
					background: url('yes')
				\`;
			`,
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},
		{
			code: outdent`
				const foo = bar.html\`
					background: url('no')
				\`;
			`,
			output: outdent`
				const foo = bar.html\`
					background: url('yes')
				\`;
			`,
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},
		/* eslint-enable no-template-curly-in-string */
		{
			code: outdent`
				const foo = <div className='
					no
				' />
			`,
			output: outdent`
				const foo = <div className='
					yes
				' />
			`,
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},
	],
});
