import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/regex-shorthand';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

const error = {
	ruleId: 'regex-shorthand',
	message: 'Use regex shorthands to improve readability.'
};

const disableSortCharacterClassesOptions = [
	{
		sortCharacterClasses: false
	}
];

ruleTester.run('regex-shorthand', rule, {
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
			errors: [
				{
					...error,
					message: '/\\w/ig can be optimized to /\\w/gi'
				}
			],
			output: 'const foo = /\\w/gi'
		},
		{
			code: 'const foo = /[0-9]/',
			errors: [
				{
					...error,
					message: '/[0-9]/ can be optimized to /\\d/'
				}
			],
			output: 'const foo = /\\d/'
		},
		{
			code: 'const foo = new RegExp(\'[0-9]\')',
			errors: [error],
			output: 'const foo = new RegExp(\'\\\\d\')'
		},
		{
			code: 'const foo = new RegExp("[0-9]")',
			errors: [error],
			output: 'const foo = new RegExp(\'\\\\d\')'
		},
		{
			code: 'const foo = new RegExp("\'[0-9]\'")',
			errors: [error],
			output: 'const foo = new RegExp(\'\\\'\\\\d\\\'\')'
		},
		{
			code: 'const foo = /[0-9]/ig',
			errors: [
				{
					...error,
					message: '/[0-9]/ig can be optimized to /\\d/gi'
				}
			],
			output: 'const foo = /\\d/gi'
		},
		{
			code: 'const foo = new RegExp(\'[0-9]\', \'ig\')',
			errors: [error],
			output: 'const foo = new RegExp(\'\\\\d\', \'ig\')'
		},
		{
			code: 'const foo = /[^0-9]/',
			errors: [
				{
					...error,
					message: '/[^0-9]/ can be optimized to /\\D/'
				}
			],
			output: 'const foo = /\\D/'
		},
		{
			code: 'const foo = /[A-Za-z0-9_]/',
			errors: [
				{
					...error,
					message: '/[A-Za-z0-9_]/ can be optimized to /\\w/'
				}
			],
			output: 'const foo = /\\w/'
		},
		{
			code: 'const foo = /[A-Za-z\\d_]/',
			errors: [
				{
					...error,
					message: '/[A-Za-z\\d_]/ can be optimized to /\\w/'
				}
			],
			output: 'const foo = /\\w/'
		},
		{
			code: 'const foo = /[a-zA-Z0-9_]/',
			errors: [
				{
					...error,
					message: '/[a-zA-Z0-9_]/ can be optimized to /\\w/'
				}
			],
			output: 'const foo = /\\w/'
		},
		{
			code: 'const foo = /[a-zA-Z\\d_]/',
			errors: [
				{
					...error,
					message: '/[a-zA-Z\\d_]/ can be optimized to /\\w/'
				}
			],
			output: 'const foo = /\\w/'
		},
		{
			code: 'const foo = /[A-Za-z0-9_]+[0-9]?\\.[A-Za-z0-9_]*/',
			errors: [
				{
					...error,
					message: '/[A-Za-z0-9_]+[0-9]?\\.[A-Za-z0-9_]*/ can be optimized to /\\w+\\d?\\.\\w*/'
				}
			],
			output: 'const foo = /\\w+\\d?\\.\\w*/'
		},
		{
			code: 'const foo = /[a-z0-9_]/i',
			errors: [
				{
					...error,
					message: '/[a-z0-9_]/i can be optimized to /\\w/i'
				}
			],
			output: 'const foo = /\\w/i'
		},
		{
			code: 'const foo = /[a-z\\d_]/i',
			errors: [
				{
					...error,
					message: '/[a-z\\d_]/i can be optimized to /\\w/i'
				}
			],
			output: 'const foo = /\\w/i'
		},
		{
			code: 'const foo = /[^A-Za-z0-9_]/',
			errors: [
				{
					...error,
					message: '/[^A-Za-z0-9_]/ can be optimized to /\\W/'
				}
			],
			output: 'const foo = /\\W/'
		},
		{
			code: 'const foo = /[^A-Za-z\\d_]/',
			errors: [
				{
					...error,
					message: '/[^A-Za-z\\d_]/ can be optimized to /\\W/'
				}
			],
			output: 'const foo = /\\W/'
		},
		{
			code: 'const foo = /[^a-z0-9_]/i',
			errors: [
				{
					...error,
					message: '/[^a-z0-9_]/i can be optimized to /\\W/i'
				}
			],
			output: 'const foo = /\\W/i'
		},
		{
			code: 'const foo = /[^a-z\\d_]/i',
			errors: [
				{
					...error,
					message: '/[^a-z\\d_]/i can be optimized to /\\W/i'
				}
			],
			output: 'const foo = /\\W/i'
		},
		{
			code: 'const foo = /[^a-z\\d_]/ig',
			errors: [
				{
					...error,
					message: '/[^a-z\\d_]/ig can be optimized to /\\W/gi'
				}
			],
			output: 'const foo = /\\W/gi'
		},
		{
			code: 'const foo = /[^\\d_a-z]/ig',
			errors: [
				{
					...error,
					message: '/[^\\d_a-z]/ig can be optimized to /\\W/gi'
				}
			],
			output: 'const foo = /\\W/gi'
		},
		{
			code: 'const foo = new RegExp(/[0-9]/)',
			errors: [
				{
					...error,
					message: '/[0-9]/ can be optimized to /\\d/'
				}
			],
			output: 'const foo = new RegExp(/\\d/)'
		},
		{
			code: 'const foo = new RegExp(/[0-9]/, \'ig\')',
			errors: [
				{
					...error,
					message: '/[0-9]/ can be optimized to /\\d/'
				}
			],
			output: 'const foo = new RegExp(/\\d/, \'ig\')'
		},
		{
			code: 'const foo = new RegExp(/[0-9]/)',
			errors: [
				{
					...error,
					message: '/[0-9]/ can be optimized to /\\d/'
				}
			],
			output: 'const foo = new RegExp(/\\d/)'
		},
		{
			code: 'const foo = new RegExp(/[0-9]/, \'ig\')',
			errors: [
				{
					...error,
					message: '/[0-9]/ can be optimized to /\\d/'
				}
			],
			output: 'const foo = new RegExp(/\\d/, \'ig\')'
		},
		{
			code: 'const foo = new RegExp(/^[^*]*[*]?$/)',
			errors: [
				{
					...error,
					message: '/^[^*]*[*]?$/ can be optimized to /^[^*]*\\*?$/'
				}
			],
			output: 'const foo = new RegExp(/^[^*]*\\*?$/)'
		},
		{
			code: 'const foo = /[a-z0-9_]/',
			errors: [
				{
					...error,
					message: '/[a-z0-9_]/ can be optimized to /[\\d_a-z]/'
				}
			],
			output: 'const foo = /[\\d_a-z]/'
		},
		{
			code: 'const foo = /^by @([a-zA-Z0-9-]+)/',
			errors: [
				{
					...error,
					message: '/^by @([a-zA-Z0-9-]+)/ can be optimized to /^by @([\\d-A-Za-z]+)/'
				}
			],
			output: 'const foo = /^by @([\\d-A-Za-z]+)/'
		},
		{
			code: '/[GgHhIiå.Z:a-f"0-8%A*ä]/',
			errors: [
				{
					...error,
					message: '/[GgHhIiå.Z:a-f"0-8%A*ä]/ can be optimized to /["%*.0-8:AG-IZa-iäå]/'
				}
			],
			output: '/["%*.0-8:AG-IZa-iäå]/'
		},
		// Should still use shorthand when disabling sort character classes
		{
			code: '/[a0-9b]/',
			options: disableSortCharacterClassesOptions,
			errors: [
				{
					...error,
					message: '/[a0-9b]/ can be optimized to /[a\\db]/'
				}
			],
			output: '/[a\\db]/'
		}
	]
});
