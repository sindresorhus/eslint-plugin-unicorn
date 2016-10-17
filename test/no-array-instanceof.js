import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-array-instanceof';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [{
	ruleId: 'no-array-instanceof',
	message: 'Use `Array.isArray()` instead of `instanceof Array`'
}];

ruleTester.run('avoid-array-instanceof', rule, {
	valid: [
		'Array.isArray(arr)',
		'Array.isArray(arr) === true',
		'Array.isArray([])',
		'Array.isArray([]) === true',
		'Array.isArray([1,2,3])',
		'Array.isArray([1,2,3]) === true',
		'if(Array.isArray(arr)){}',
		'if(Array.isArray([1,2,3])){}'
	],
	invalid: [
		{
			code: 'arr instanceof Array',
			output: 'Array.isArray(arr)',
			errors
		},
		{
			code: 'arr instanceof Array === true',
			output: 'Array.isArray(arr) === true',
			errors
		},
		{
			code: '[] instanceof Array',
			output: 'Array.isArray([])',
			errors
		},
		{
			code: '[] instanceof Array === true',
			output: 'Array.isArray([]) === true',
			errors
		},
		{
			code: '[1,2,3] instanceof Array',
			output: 'Array.isArray([1,2,3])',
			errors
		},
		{
			code: '[1,2,3] instanceof Array === true',
			output: 'Array.isArray([1,2,3]) === true',
			errors
		},
		{
			code: 'if(arr instanceof Array){}',
			output: 'if(Array.isArray(arr)){}',
			errors
		},
		{
			code: 'if([1,2,3] instanceof Array){}',
			output: 'if(Array.isArray([1,2,3])){}',
			errors
		}
	]
});
