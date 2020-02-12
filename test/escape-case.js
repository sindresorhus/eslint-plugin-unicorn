/* eslint-disable no-template-curly-in-string, unicorn/escape-case */
import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/escape-case';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [
	{
		ruleId: 'escape-case',
		message: 'Use uppercase characters for the value of the escape sequence.'
	}
];

ruleTester.run('escape-case', rule, {
	valid: [
		// Literal string
		'const foo = "\\xA9";',
		'const foo = "\\uD834";',
		'const foo = "\\u{1D306}";',
		'const foo = "\\uD834foo";',
		'const foo = "foo\\uD834";',
		'const foo = "foo \\uD834";',
		'const foo = "foo \\u2500";',
		'const foo = "foo \\x46";',
		'const foo = "foo\\\\xbar";',
		'const foo = "foo\\\\ubarbaz";',
		'const foo = "foo\\\\\\\\xbar";',
		'const foo = "foo\\\\\\\\ubarbaz";',

		// TemplateLiteral
		'const foo = `\\xA9`;',
		'const foo = `\\uD834`;',
		'const foo = `\\u{1D306}`;',
		'const foo = `\\uD834foo`;',
		'const foo = `foo\\uD834`;',
		'const foo = `foo \\uD834`;',
		'const foo = `${"\uD834 foo"} \\uD834`;',
		'const foo = `foo \\u2500`;',
		'const foo = `foo \\x46`;',
		'const foo = `foo\\\\xbar`;',
		'const foo = `foo\\\\ubarbaz`;',
		'const foo = `foo\\\\\\\\xbar`;',
		'const foo = `foo\\\\\\\\ubarbaz`;',

		// Literal regex
		'const foo = /foo\\xA9/',
		'const foo = /foo\\uD834/',
		'const foo = /foo\\u{1D306}/u',
		'const foo = /foo\\cA/',
		// Escape
		'const foo = /foo\\\\xa9/;',
		'const foo = /foo\\\\\\\\xa9/;',
		'const foo = /foo\\\\uD834/',
		'const foo = /foo\\\\u{1}/u',
		'const foo = /foo\\\\cA/',

		// RegExp
		'const foo = new RegExp("/\\xA9")',
		'const foo = new RegExp("/\\uD834/")',
		'const foo = new RegExp("/\\u{1D306}/", "u")',
		'const foo = new RegExp("/\\cA/")'
	],
	invalid: [
		// Literal string
		{
			code: 'const foo = "\\xa9";',
			errors,
			output: 'const foo = "\\xA9";'
		},
		{
			code: 'const foo = "\\xAb";',
			errors,
			output: 'const foo = "\\xAB";'
		},
		{
			code: 'const foo = "\\ud834";',
			errors,
			output: 'const foo = "\\uD834";'
		},
		{
			code: 'const foo = "\\u{1d306}";',
			errors,
			output: 'const foo = "\\u{1D306}";'
		},
		{
			code: 'const foo = "\\ud834foo";',
			errors,
			output: 'const foo = "\\uD834foo";'
		},
		{
			code: 'const foo = "foo\\ud834";',
			errors,
			output: 'const foo = "foo\\uD834";'
		},
		{
			code: 'const foo = "foo \\ud834";',
			errors,
			output: 'const foo = "foo \\uD834";'
		},
		{
			code: 'const foo = "\\\\\\ud834foo";',
			errors,
			output: 'const foo = "\\\\\\uD834foo";'
		},
		{
			code: 'const foo = "foo\\\\\\ud834";',
			errors,
			output: 'const foo = "foo\\\\\\uD834";'
		},
		{
			code: 'const foo = "foo \\\\\\ud834";',
			errors,
			output: 'const foo = "foo \\\\\\uD834";'
		},

		// TemplateLiteral
		{
			code: 'const foo = `\\xa9`;',
			errors,
			output: 'const foo = `\\xA9`;'
		},
		{
			code: 'const foo = `\\ud834`;',
			errors,
			output: 'const foo = `\\uD834`;'
		},
		{
			code: 'const foo = `\\u{1d306}`;',
			errors,
			output: 'const foo = `\\u{1D306}`;'
		},
		{
			code: 'const foo = `\\ud834foo`;',
			errors,
			output: 'const foo = `\\uD834foo`;'
		},
		{
			code: 'const foo = `foo\\ud834`;',
			errors,
			output: 'const foo = `foo\\uD834`;'
		},
		{
			code: 'const foo = `foo \\ud834`;',
			errors,
			output: 'const foo = `foo \\uD834`;'
		},
		{
			code: 'const foo = `${"\ud834 foo"} \\ud834`;',
			errors,
			output: 'const foo = `${"\uD834 foo"} \\uD834`;'
		},
		{
			code: 'const foo = `\\ud834${foo}\\ud834${foo}\\ud834`;',
			errors: Array.from({length: 3}, () => errors[0]),
			output: 'const foo = `\\uD834${foo}\\uD834${foo}\\uD834`;'
		},
		{
			code: 'const foo = `\\\\\\ud834foo`;',
			errors,
			output: 'const foo = `\\\\\\uD834foo`;'
		},
		{
			code: 'const foo = `foo\\\\\\ud834`;',
			errors,
			output: 'const foo = `foo\\\\\\uD834`;'
		},
		{
			code: 'const foo = `foo \\\\\\ud834`;',
			errors,
			output: 'const foo = `foo \\\\\\uD834`;'
		},

		// Literal regex
		{
			code: 'const foo = /\\xa9/;',
			errors,
			output: 'const foo = /\\xA9/;'
		},
		{
			code: 'const foo = /\\ud834/',
			errors,
			output: 'const foo = /\\uD834/'
		},
		{
			code: 'const foo = /\\u{1d306}/u',
			errors,
			output: 'const foo = /\\u{1D306}/u'
		},
		{
			code: 'const foo = /\\ca/',
			errors,
			output: 'const foo = /\\cA/'
		},
		{
			code: 'const foo = /foo\\\\\\xa9/;',
			errors,
			output: 'const foo = /foo\\\\\\xA9/;'
		},
		{
			code: 'const foo = /foo\\\\\\\\\\xa9/;',
			errors,
			output: 'const foo = /foo\\\\\\\\\\xA9/;'
		},

		// RegExp
		{
			code: 'const foo = new RegExp("/\\xa9")',
			errors,
			output: 'const foo = new RegExp("/\\xA9")'
		},
		{
			code: 'const foo = new RegExp("/\\ud834/")',
			errors,
			output: 'const foo = new RegExp("/\\uD834/")'
		},
		{
			code: 'const foo = new RegExp("/\\u{1d306}/", "u")',
			errors,
			output: 'const foo = new RegExp("/\\u{1D306}/", "u")'
		}
	]
});
