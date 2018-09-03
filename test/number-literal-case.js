import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/number-literal-case';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const error = {
	ruleId: 'number-literal-case',
	message: 'Invalid number literal casing.'
};

ruleTester.run('number-literal-case', rule, {
	valid: [
		'const foo = 0xFF',
		'const foo = 0b11',
		'const foo = 0o10',
		'const foo = \'0Xff\''
	],
	invalid: [
		{
			code: 'const foo = 0XFF',
			errors: [error],
			output: 'const foo = 0xFF'
		},
		{
			code: 'const foo = 0xff',
			errors: [error],
			output: 'const foo = 0xFF'
		},
		{
			code: 'const foo = 0Xff',
			errors: [error],
			output: 'const foo = 0xFF'
		},
		{
			code: 'const foo = 0Xff',
			errors: [error],
			output: 'const foo = 0xFF'
		},
		{
			code: 'const foo = 0B11',
			errors: [error],
			output: 'const foo = 0b11'
		},
		{
			code: 'const foo = 0O10',
			errors: [error],
			output: 'const foo = 0o10'
		},
		{
			code: `
				const foo = 255;

				if (foo === 0xff) {
					console.log('invalid');
				}
			`,
			errors: [error],
			output: `
				const foo = 255;

				if (foo === 0xFF) {
					console.log('invalid');
				}
			`
		}
	]
});
