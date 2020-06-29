import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/no-object-as-default-parameter';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

const error = {
	messageId: 'noObjectAsDefaultParameter',
	data: {parameter: 'foo'}
};

ruleTester.run('no-object-as-default-parameter', rule, {
	valid: [
		'const abc = {};',
		'const abc = {foo: 123};',
		'function abc(foo) {}',
		'function abc(foo = null) {}',
		'function abc(foo = undefined) {}',
		'function abc(foo = 123) {}',
		'function abc(foo = true) {}',
		'function abc(foo = "bar") {}',
		'function abc(foo = 123, bar = "foo") {}',
		'function abc(foo = {}) {}',
		'function abc({foo = 123} = {}) {}',
		'(function abc() {})(foo = {a: 123})',
		'const abc = foo => {};',
		'const abc = (foo = null) => {};',
		'const abc = (foo = undefined) => {};',
		'const abc = (foo = 123) => {};',
		'const abc = (foo = true) => {};',
		'const abc = (foo = "bar") => {};',
		'const abc = (foo = 123, bar = "foo") => {};',
		'const abc = (foo = {}) => {};',
		'const abc = ({a = true, b = "foo"}) => {};',
		'const abc = function(foo = 123) {}',
		'const {abc = {foo: 123}} = bar;',
		'const {abc = {null: "baz"}} = bar;',
		'const {abc = {foo: undefined}} = undefined;',
		'const abc = ([{foo = false, bar = 123}]) => {};',
		'const abc = ({foo = {a: 123}}) => {};',
		'const abc = ([foo = {a: 123}]) => {};',
		'const abc = ({foo: bar = {a: 123}}) => {};',
		'const abc = () => (foo = {a: 123});',
		outdent`
			class A {
				[foo = {a: 123}]() {}
			}
		`,
		outdent`
			class A extends (foo = {a: 123}) {
				a() {}
			}
		`
	],
	invalid: [
		{
			code: 'function abc(foo = {a: 123}) {}',
			errors: [error]
		},
		{
			code: 'async function * abc(foo = {a: 123}) {}',
			errors: [error]
		},
		{
			code: 'function abc(foo = {a: false}) {}',
			errors: [error]
		},
		{
			code: 'function abc(foo = {a: "bar"}) {}',
			errors: [error]
		},
		{
			code: 'function abc(foo = {a: "bar", b: {c: true}}) {}',
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
		},
		{
			code: 'const abc = function(foo = {a: 123}) {}',
			errors: [error]
		},
		{
			code: outdent`
				class A {
					abc(foo = {a: 123}) {}
				}
			`,
			errors: [error]
		},
		{
			code: outdent`
				class A {
					constructor(foo = {a: 123}) {}
				}
			`,
			errors: [error]
		},
		{
			code: outdent`
				class A {
					set abc(foo = {a: 123}) {}
				}
			`,
			errors: [error]
		},
		{
			code: outdent`
				class A {
					static abc(foo = {a: 123}) {}
				}
			`,
			errors: [error]
		},
		{
			code: outdent`
				class A {
					* abc(foo = {a: 123}) {}
				}
			`,
			errors: [error]
		},
		{
			code: outdent`
				class A {
					static async * abc(foo = {a: 123}) {}
				}
			`,
			errors: [error]
		},
		{
			code: outdent`
				class A {
					[foo = {a: 123}](foo = {a: 123}) {}
				}
			`,
			errors: [error]
		},
		{
			code: outdent`
				const A = class {
					abc(foo = {a: 123}) {}
				}
			`,
			errors: [error]
		},
		{
			code: outdent`
				object = {
					abc(foo = {a: 123}) {}
				};
			`,
			errors: [error]
		},
		// Actual message
		{
			code: 'function abc(foo = {a: 123}) {}',
			errors: [{
				message: 'Do not use an object literal as default for parameter `foo`.'
			}]
		}
	]
});
