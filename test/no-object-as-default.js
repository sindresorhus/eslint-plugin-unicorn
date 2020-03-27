import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-object-as-default';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = {
	ruleId: 'no-object-as-default',
	messageId: 'noObjectAsDefault',
	data: {parameter: 'foo'}
};

ruleTester.run('no-object-as-default', rule, {
	valid: [
		'const abc = {};',
		'const abc = {foo: 123};',
		'function abc(foo) {}',
		'function abc(foo = null) {}',
		'function abc(foo = undefined) {}',
		'function abc(foo = 123) {}',
		'function abc(foo = true) {}',
		'function abc(foo = \'bar\') {}',
		'function abc(foo = 123, bar = \'foo\') {}',
		'function abc(foo = {}) {}',
		'function abc({foo = 123} = {}) {}',
		'const abc = foo => {};',
		'const abc = (foo = null) => {};',
		'const abc = (foo = undefined) => {};',
		'const abc = (foo = 123) => {};',
		'const abc = (foo = true) => {};',
		'const abc = (foo = \'bar\') => {};',
		'const abc = (foo = 123, bar = \'foo\') => {};',
		'const abc = (foo = {}) => {};',
		'const abc = ({a = true, b = \'foo\'}) => {};'
	],
	invalid: [
		{
			code: 'function abc(foo = {a: 123}) {}',
			errors: [error]
		},
		{
			code: 'function abc(foo = {a: false}) {}',
			errors: [error]
		},
		{
			code: 'function abc(foo = {a: \'bar\'}) {}',
			errors: [error]
		},
		{
			code: 'function abc(foo = {a: \'bar\', b: {c: true}}) {}',
			errors: [error]
		},
		{
			code: 'const abc = (foo = {a: false}) => {};',
			errors: [error]
		},
		{
			code: 'const abc = (foo = {a: 123, b: false}) => {};',
			errors: [error]
		},
		{
			code: 'const abc = (foo = {a: false, b: 1, c: "test", d: null}) => {};',
			errors: [error]
		}
	]
});
