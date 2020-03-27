import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-null';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const noNullError = {
	ruleId: 'no-null',
	message: 'Use undefined instead of null'
};

ruleTester.run('no-null', rule, {
	valid: [
		'let foo',
		'Object.create(null)'
	],
	invalid: [
		{
			code: 'const foo = null',
			errors: [
				noNullError
			]
		},
		{
			code: 'if (bar === null) {}',
			errors: [
				noNullError
			]
		}
	]
});
