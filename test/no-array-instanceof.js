import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-array-instanceof';
import visualizeRuleTester from './utils/visualize-rule-tester';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [
	{
		messageId: 'no-array-instanceof'
	}
];

ruleTester.run('no-array-instanceof', rule, {
	valid: [
		'Array.isArray(arr)',
		'arr instanceof Object',
		'arr instanceof array',
		'a instanceof \'array\'',
		'a instanceof ArrayA',
		'a.x[2] instanceof foo()',
		'Array.isArray([1,2,3]) === true',
		'"arr instanceof Array"'
	],
	invalid: [
		{
			code: 'arr instanceof Array',
			output: 'Array.isArray(arr)',
			errors
		},
		{
			code: '[] instanceof Array',
			output: 'Array.isArray([])',
			errors
		},
		{
			code: '[1,2,3] instanceof Array === true',
			output: 'Array.isArray([1,2,3]) === true',
			errors
		},
		{
			code: 'fun.call(1, 2, 3) instanceof Array',
			output: 'Array.isArray(fun.call(1, 2, 3))',
			errors
		},
		{
			code: 'obj.arr instanceof Array',
			output: 'Array.isArray(obj.arr)',
			errors
		},
		{
			code: 'foo.bar[2] instanceof Array',
			output: 'Array.isArray(foo.bar[2])',
			errors
		}
	]
});

const visualizeTester = visualizeRuleTester(test);
visualizeTester.run('no-array-instanceof', rule, [
	'if (arr instanceof Array) {}'
]);
