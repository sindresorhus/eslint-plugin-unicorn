import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const errorNew = {
	messageId: 'noKeywordPrefix',
	data: {keyword: 'new'}
};
const errorClass = {
	messageId: 'noKeywordPrefix',
	data: {keyword: 'class'}
};
const errorIgnoreList = {
	messageId: 'noKeywordPrefix',
	data: {keyword: 'old'}
};

// Most of these test cases copied from:
// https://github.com/eslint/eslint/blob/master/tests/lib/rules/camelcase.js
test({
	valid: [
		'const foo = "foo"',
		'const fooNew = "foo"',
		'const fooNewFoo = "foo"',
		'const NEW_FOO = "foo"',
		'const _newFoo = "foo"',
		'const new_foo = "foo"',
		'const newfoo = "foo"',

		'function fooNew(){}',
		'new newFoo',
		'new newFoo()',
		'foo.newFoo()',
		'const foo = bar.newBar;',
		'foo.newFoo.foo = bar.newBar.bar;',
		'if (foo.newFoo) {}',
		'const foo = { foo: bar.newBar };',
		'const foo = [bar.newBar];',
		'[foo.newFoo]',
		'const foo = [bar.newBar.bar];',
		'[foo.newFoo.foo]',
		'if (foo.newFoo === bar.newBar) { [foo.newFoo] }',
		'const { newFoo: foo } = bar;',
		'const { _newFoo } = bar;',
		'import { newFoo as foo } from "external module";',
		'import { newFoo as _newFoo } from "external module";',
		'function foo({ bar }) {};',
		'function foo({ _newBar }) {};',
		'function foo({ newBar: bar }) {};',
		'function foo({ newBar: _newBar }) {};',
		{
			code: 'var foo = {bar: 1}',
			options: [{checkProperties: true}]
		},
		{
			code: 'var foo = {_newBar: 1}',
			options: [{checkProperties: true}]
		},
		{
			code: 'var foo = {newBar: 1}',
			options: [{checkProperties: false}]
		},
		{
			code: 'var foo = {_newBar: 1}',
			options: [{checkProperties: false}]
		},
		{
			code: 'foo.newFoo = 2;',
			options: [{checkProperties: false}]
		},
		{
			code: 'foo._newFoo = 2;',
			options: [{checkProperties: true}]
		},
		{
			code: 'foo._newFoo = 2;',
			options: [{checkProperties: false}]
		},
		{
			code: 'var foo = {\n newFoo: 1 \n};\n obj.newBar = 2;',
			options: [{checkProperties: false}]
		},
		{
			code: 'foo.newFoo = function(){};',
			options: [{checkProperties: false}]
		},
		{
			code: 'const newFoo = "foo"',
			options: [{disallowedPrefixes: ['old']}]
		},
		outdent`
			function Foo() {
				console.log(new.target, new.target.name);
			}
		`,
		outdent`
			class Foo {
				constructor() {
					console.log(new.target, new.target.name);
				}
			}
		`,
		'const foo = {new: 1};',
		{
			code: 'var foo = {new: 1}',
			options: [{checkProperties: false}]
		}
	],
	invalid: [
		{
			code: 'const newFoo = "foo"',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'const classFoo = "foo"',
			output: null,
			errors: [errorClass]
		},
		{
			code: 'let newFoo = "foo"',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'var newFoo = "foo"',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'function newFoo(){}',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'foo.newFoo = function(){};',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'newFoo.foo = function(){};',
			output: null,
			errors: [errorNew]
		},
		{
			code: '[newFoo.baz]',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'if (foo.newFoo === bar.newBar) { [newFoo.foo] }',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'foo.newFoo = bar.newBar',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'var foo = { newFoo: bar.newBar }',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'foo.foo.newFoo = { bar: bar.newBar }',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'var foo = {newFoo: 1}',
			output: null,
			options: [{checkProperties: true}],
			errors: [errorNew]
		},
		{
			code: 'foo.newFoo = 2;',
			output: null,
			options: [{checkProperties: true}],
			errors: [errorNew]
		},
		{
			code: 'var { newFoo: newBar } = foo;',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'var { [newFoo]: bar } = foo;',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'var { newFoo } = foo;',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'var { newFoo: newFoo } = foo;',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'var { newFoo = 1 } = foo;',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'import newFoo from "external-module";',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'import * as newFoo from "external-module";',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'import { newFoo } from "external-module";',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'import { newFoo as newBar } from "external module";',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'import { foo as newFoo } from "external module";',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'import { foo, newBar } from "external-module";',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'import { newFoo as foo, newBar } from "external-module";',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'import foo, { newBar } from "external-module";',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'import newFoo, { newBar as bar } from "external-module";',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'function foo({ newBar }) {};',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'function foo({ newBar = \'default value\' }) {};',
			output: null,
			parserOptions: {ecmaVersion: 6},
			errors: [errorNew]
		},
		{
			code: 'const newFoo = 0; function foo({ newBar = newFoo}) {}',
			output: null,
			parserOptions: {ecmaVersion: 6},
			errors: [errorNew, errorNew]
		},
		{
			code: 'const { bar: newBar } = foo;',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'function foo({ newBar: newFoo }) {}',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'function foo({ bar: newBar }) {};',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'var { foo: newBar = 1 } = bar;',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'const { newFoo = false } = foo;',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'const { newFoo = newBar } = foo;',
			output: null,
			errors: [errorNew]
		},
		{
			code: 'const oldFoo = "foo"',
			output: null,
			options: [{disallowedPrefixes: ['old']}],
			errors: [errorIgnoreList]
		},
		{
			code: 'const new_foo = "foo"',
			output: null,
			options: [{onlyCamelCase: false}],
			errors: [errorNew]
		}
	]
});
