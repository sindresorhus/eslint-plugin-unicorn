import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-string-slice';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = name => ({
	ruleId: 'prefer-string-slice',
	message: `Use String.slice instead of String.${name}.`
});

ruleTester.run('prefer-string-slice', rule, {
	valid: [
		'const foo = bar.slice(1)',
		`const foo = bar.slice(function() { return 1; }, 2);`
	],
	invalid: [
		{
			code: 'const foo = bar.substr(1)',
			errors: [error('substr')]
		},
		{
			code: 'const foo = bar.substr(1,2)',
			errors: [error('substr')]
		},
		{
			code: `const foo = bar.substr(function() { return 1; }, 2);`,
			errors: [error('substr')]
		},
		{
			code: 'const foo = bar.substring(1)',
			errors: [error('substring')]
		},
		{
			code: 'const foo = bar.substring(1,2)',
			errors: [error('substring')]
		},
		{
			code: `const foo = bar.substring(function() { return 1; }, 2);`,
			errors: [error('substring')]
		}
	]
});
