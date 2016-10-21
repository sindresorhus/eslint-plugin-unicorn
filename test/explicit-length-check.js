import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/explicit-length-check';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [{
	ruleId: 'explicit-length-check',
	message: '`length` property should be compared to a value.'
}];

ruleTester.run('explicit-length-check', rule, {
	valid: [
		'array.foo',
		'array.length',
		'array.length === 0',
		'array.length !== 0',
		'array.length > 0',
		'if (array.foo) {}',
		'if (length) {}',
		'if ([].length > 0) {}',
		'if ("".length > 0) {}',
		'if (array.length === 0) {}',
		'if (array.length !== 0) {}',
		'if (array.length !== 0 && array[0] === 1) {}'
	],
	invalid: [
		{
			code: 'if ([].length) {}',
			errors
		},
		{
			code: 'if ("".length) {}',
			errors
		},
		{
			code: 'if (array.length) {}',
			errors
		},
		{
			code: 'if (!array.length) {}',
			errors
		},
		{
			code: 'if (array.foo.length) {}',
			errors
		},
		{
			code: 'if (!!array.length) {}',
			errors
		},
		{
			code: 'if (array.length && array[0] === 1) {}',
			errors
		},
		{
			code: 'if (array[0] === 1 || array.length) {}',
			errors
		}
	]
});
