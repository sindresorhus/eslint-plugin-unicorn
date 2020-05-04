import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-useless-undefined';

const messageId = 'no-useless-undefined';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

const errors = [{messageId}];

ruleTester.run('better-regex', rule, {
	valid: [
		'function foo() {return;}',
		'const foo = () => {};',
		'let foo;',
		'var foo;',
		'const foo = undefined;',
		'foo();',
		'foo(bar,);',
		'foo(undefined, bar);',
		'const {foo} = {};',
		'function foo({bar} = {}) {}',
		'function foo(bar) {}'
	],
	invalid: [
		{
			code: 'function foo() {return undefined;}',
			output: 'function foo() {return ;}',
			errors
		},
		{
			code: 'const foo = () => undefined;',
			output: 'const foo = () => {};',
			errors
		},
		{
			code: 'const foo = () => {return undefined;};',
			output: 'const foo = () => {return ;};',
			errors
		},
		{
			code: 'function* foo() {yield undefined;}',
			output: 'function* foo() {yield ;}',
			errors
		},
		{
			code: 'let a = undefined;',
			output: 'let a;',
			errors
		},
		{
			code: 'let a = undefined, b = 2;',
			output: 'let a, b = 2;',
			errors
		},
		{
			code: 'var a = undefined;',
			output: 'var a;',
			errors
		},
		{
			code: 'var a = undefined, b = 2;',
			output: 'var a, b = 2;',
			errors
		},
		{
			code: 'foo(undefined);',
			output: 'foo();',
			errors
		},
		{
			code: 'foo(undefined, undefined);',
			output: 'foo(undefined);',
			errors
		},
		{
			code: 'foo(undefined,);',
			output: 'foo();',
			errors
		},
		{
			code: 'foo(undefined, undefined,);',
			output: 'foo(undefined,);',
			errors
		},
		{
			code: 'foo(bar, undefined);',
			output: 'foo(bar);',
			errors
		},
		{
			code: 'foo(bar, undefined, undefined);',
			output: 'foo(bar, undefined);',
			errors
		},
		{
			code: 'foo(bar, undefined,);',
			output: 'foo(bar,);',
			errors
		},
		{
			code: 'foo(bar, undefined, undefined,);',
			output: 'foo(bar, undefined,);',
			errors
		},
		{
			code: 'const {foo = undefined} = {};',
			output: 'const {foo} = {};',
			errors
		},
		{
			code: 'const [foo = undefined] = [];',
			output: 'const [foo] = [];',
			errors
		},
		{
			code: 'function foo(bar = undefined) {}',
			output: 'function foo(bar) {}',
			errors
		},
		{
			code: 'function foo({bar = undefined}) {}',
			output: 'function foo({bar}) {}',
			errors
		},
		{
			code: 'function foo({bar = undefined} = {}) {}',
			output: 'function foo({bar} = {}) {}',
			errors
		},
		{
			code: 'function foo([bar = undefined]) {}',
			output: 'function foo([bar]) {}',
			errors
		},
		{
			code: 'function foo([bar = undefined] = []) {}',
			output: 'function foo([bar] = []) {}',
			errors
		}
	]
});
