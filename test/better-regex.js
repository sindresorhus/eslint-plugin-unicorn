import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/better-regex';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

const createError = (original, optimized) => [
	{
		ruleId: 'better-regex',
		message: `${original} can be optimized to ${optimized}`
	}
];

const disableSortCharacterClassesOptions = [
	{
		sortCharacterClasses: false
	}
];

ruleTester.run('better-regex', rule, {
	valid: [
		'const foo = /\\d/',
		'const foo = /\\W/i',
		'const foo = /\\w/gi',
		'const foo = /[a-z]/gi',
		'const foo = /\\d*?/gi',
		'const foo = new RegExp(\'\\d\')',
		'const foo = new RegExp(\'\\d\', \'ig\')',
		'const foo = new RegExp(\'\\d*?\')',
		'const foo = new RegExp(\'[a-z]\', \'i\')',
		'const foo = new RegExp(/\\d/)',
		'const foo = new RegExp(/\\d/gi)',
		'const foo = new RegExp(/\\d/, \'ig\')',
		'const foo = new RegExp(/\\d*?/)',
		'const foo = new RegExp(/[a-z]/, \'i\')',

		// Should not crash ESLint (#446 and #448)
		'/\\{\\{verificationUrl\\}\\}/gu',
		'/^test-(?<name>[a-zA-Z-\\d]+)$/u',

		// Should not suggest wrong regex (#447)
		'/(\\s|\\.|@|_|-)/u',
		'/[\\s.@_-]/u',

		{
			code: '/[GgHhIiå.Z:a-f"0-8%A*ä]/',
			options: disableSortCharacterClassesOptions
		}
	],
	invalid: [
		{
			code: 'const foo = /\\w/ig',
			errors: createError('/\\w/ig', '/\\w/gi'),
			output: 'const foo = /\\w/gi'
		},
		{
			code: 'const foo = /[0-9]/',
			errors: createError('/[0-9]/', '/\\d/'),
			output: 'const foo = /\\d/'
		},
		{
			code: 'const foo = new RegExp(\'[0-9]\')',
			errors: createError('[0-9]', '\\d'),
			output: 'const foo = new RegExp(\'\\\\d\')'
		},
		{
			code: 'const foo = new RegExp("[0-9]")',
			errors: createError('[0-9]', '\\d'),
			output: 'const foo = new RegExp(\'\\\\d\')'
		},
		{
			code: 'const foo = new RegExp("\'[0-9]\'")',
			errors: createError('\'[0-9]\'', '\'\\d\''),
			output: 'const foo = new RegExp(\'\\\'\\\\d\\\'\')'
		},
		{
			code: 'const foo = /[0-9]/ig',
			errors: createError('/[0-9]/ig', '/\\d/gi'),
			output: 'const foo = /\\d/gi'
		},
		{
			code: 'const foo = new RegExp(\'[0-9]\', \'ig\')',
			errors: createError('[0-9]', '\\d'),
			output: 'const foo = new RegExp(\'\\\\d\', \'ig\')'
		},
		{
			code: 'const foo = /[^0-9]/',
			errors: createError('/[^0-9]/', '/\\D/'),
			output: 'const foo = /\\D/'
		},
		{
			code: 'const foo = /[A-Za-z0-9_]/',
			errors: createError('/[A-Za-z0-9_]/', '/\\w/'),
			output: 'const foo = /\\w/'
		},
		{
			code: 'const foo = /[A-Za-z\\d_]/',
			errors: createError('/[A-Za-z\\d_]/', '/\\w/'),
			output: 'const foo = /\\w/'
		},
		{
			code: 'const foo = /[a-zA-Z0-9_]/',
			errors: createError('/[a-zA-Z0-9_]/', '/\\w/'),
			output: 'const foo = /\\w/'
		},
		{
			code: 'const foo = /[a-zA-Z\\d_]/',
			errors: createError('/[a-zA-Z\\d_]/', '/\\w/'),
			output: 'const foo = /\\w/'
		},
		{
			code: 'const foo = /[A-Za-z0-9_]+[0-9]?\\.[A-Za-z0-9_]*/',
			errors: createError('/[A-Za-z0-9_]+[0-9]?\\.[A-Za-z0-9_]*/', '/\\w+\\d?\\.\\w*/'),
			output: 'const foo = /\\w+\\d?\\.\\w*/'
		},
		{
			code: 'const foo = /[a-z0-9_]/i',
			errors: createError('/[a-z0-9_]/i', '/\\w/i'),
			output: 'const foo = /\\w/i'
		},
		{
			code: 'const foo = /[a-z\\d_]/i',
			errors: createError('/[a-z\\d_]/i', '/\\w/i'),
			output: 'const foo = /\\w/i'
		},
		{
			code: 'const foo = /[^A-Za-z0-9_]/',
			errors: createError('/[^A-Za-z0-9_]/', '/\\W/'),
			output: 'const foo = /\\W/'
		},
		{
			code: 'const foo = /[^A-Za-z\\d_]/',
			errors: createError('/[^A-Za-z\\d_]/', '/\\W/'),
			output: 'const foo = /\\W/'
		},
		{
			code: 'const foo = /[^a-z0-9_]/i',
			errors: createError('/[^a-z0-9_]/i', '/\\W/i'),
			output: 'const foo = /\\W/i'
		},
		{
			code: 'const foo = /[^a-z\\d_]/i',
			errors: createError('/[^a-z\\d_]/i', '/\\W/i'),
			output: 'const foo = /\\W/i'
		},
		{
			code: 'const foo = /[^a-z\\d_]/ig',
			errors: createError('/[^a-z\\d_]/ig', '/\\W/gi'),
			output: 'const foo = /\\W/gi'
		},
		{
			code: 'const foo = /[^\\d_a-z]/ig',
			errors: createError('/[^\\d_a-z]/ig', '/\\W/gi'),
			output: 'const foo = /\\W/gi'
		},
		{
			code: 'const foo = new RegExp(/[0-9]/)',
			errors: createError('/[0-9]/', '/\\d/'),
			output: 'const foo = new RegExp(/\\d/)'
		},
		{
			code: 'const foo = new RegExp(/[0-9]/, \'ig\')',
			errors: createError('/[0-9]/', '/\\d/'),
			output: 'const foo = new RegExp(/\\d/, \'ig\')'
		},
		{
			code: 'const foo = new RegExp(/[0-9]/)',
			errors: createError('/[0-9]/', '/\\d/'),
			output: 'const foo = new RegExp(/\\d/)'
		},
		{
			code: 'const foo = new RegExp(/[0-9]/, \'ig\')',
			errors: createError('/[0-9]/', '/\\d/'),
			output: 'const foo = new RegExp(/\\d/, \'ig\')'
		},
		{
			code: 'const foo = new RegExp(/^[^*]*[*]?$/)',
			errors: createError('/^[^*]*[*]?$/', '/^[^*]*\\*?$/'),
			output: 'const foo = new RegExp(/^[^*]*\\*?$/)'
		},
		{
			code: 'const foo = /[a-z0-9_]/',
			errors: createError('/[a-z0-9_]/', '/[\\d_a-z]/'),
			output: 'const foo = /[\\d_a-z]/'
		},
		{
			code: 'const foo = /^by @([a-zA-Z0-9-]+)/',
			errors: createError('/^by @([a-zA-Z0-9-]+)/', '/^by @([\\d-A-Za-z]+)/'),
			output: 'const foo = /^by @([\\d-A-Za-z]+)/'
		},
		{
			code: '/[GgHhIiå.Z:a-f"0-8%A*ä]/',
			errors: createError('/[GgHhIiå.Z:a-f"0-8%A*ä]/', '/["%*.0-8:AG-IZa-iäå]/'),
			output: '/["%*.0-8:AG-IZa-iäå]/'
		},
		// Should still use shorthand when disabling sort character classes
		{
			code: '/[a0-9b]/',
			options: disableSortCharacterClassesOptions,
			errors: createError('/[a0-9b]/', '/[a\\db]/'),
			output: '/[a\\db]/'
		}
	]
});
