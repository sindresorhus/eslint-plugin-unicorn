import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-fn-reference-in-iterator';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [
	{
		ruleId: 'no-fn-reference-in-iterator',
		message: 'Do not pass a function reference directly to an iterator method.'
	}
];

ruleTester.run('no-fn-reference-in-iterator', rule, {
	valid: [
		'foo.map(x => fn(x))',
		'foo.forEach(x => fn(x))',
		'foo.every(x => fn(x))',
		'foo.filter(x => fn(x))',
		'foo.find(x => fn(x))',
		'foo.findIndex(x => fn(x))',
		'foo.some(x => fn(x))',
		'foo.filter(x => Boolean(x))',
		'foo.filter(Boolean)',
		'foo.map(x => parseInt(x, 10))',
		'foo.map(x => m({foo: true})(x))',
		'foo.reduce((a, b) => a + b, 0)',
		'foo.reduceRight((a, b) => a.concat(b), [])'
	],
	invalid: [
		{
			code: 'foo.map(fn)',
			errors,
			output: 'foo.map(x => fn(x))'
		},
		{
			code: 'foo.forEach(fn)',
			errors,
			output: 'foo.forEach(x => fn(x))'
		},
		{
			code: 'foo.every(fn)',
			errors,
			output: 'foo.every(x => fn(x))'
		},
		{
			code: 'foo.filter(fn)',
			errors,
			output: 'foo.filter(x => fn(x))'
		},
		{
			code: 'foo.find(fn)',
			errors,
			output: 'foo.find(x => fn(x))'
		},
		{
			code: 'foo.findIndex(fn)',
			errors,
			output: 'foo.findIndex(x => fn(x))'
		},
		{
			code: 'foo.some(fn)',
			errors,
			output: 'foo.some(x => fn(x))'
		},
		{
			code: 'foo.filter(fn)',
			errors,
			output: 'foo.filter(x => fn(x))'
		},
		{
			code: 'foo.map(parseInt)',
			errors,
			output: 'foo.map(x => parseInt(x))'
		},
		{
			code: 'foo.map(m({foo: true}))',
			errors,
			output: 'foo.map(x => m({foo: true})(x))'
		},
		{
			code: 'foo.reduce(m)',
			errors,
			output: 'foo.reduce((a, b) => m(a, b))'
		},
		{
			code: 'foo.reduce(m, 0)',
			errors,
			output: 'foo.reduce((a, b) => m(a, b), 0)'
		},
		{
			code: 'foo.reduce(m({foo: true}), 0)',
			errors,
			output: 'foo.reduce((a, b) => m({foo: true})(a, b), 0)'
		},
		{
			code: 'foo.reduceRight(m, [])',
			errors,
			output: 'foo.reduceRight((a, b) => m(a, b), [])'
		}
	]
});
