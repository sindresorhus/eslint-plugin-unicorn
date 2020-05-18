import test from 'ava';
import {outdent} from 'outdent';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-array-find';

const MESSAGE_ID_ZERO_INDEX = 'prefer-array-find-over-filter-zero-index';
const MESSAGE_ID_SHIFT = 'prefer-array-find-over-filter-shift';
const MESSAGE_ID_DESTRUCTURING = 'prefer-array-find-over-filter-destructuring';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

ruleTester.run('prefer-array-find', rule, {
	valid: [
		'array.find(foo)',

		// Test `[0]`
		'array.filter(foo)',
		'array.filter(foo)[+0]',
		'array.filter(foo)[-0]',
		'array.filter(foo)[1-1]',
		'array.filter(foo)["0"]',
		'array.filter(foo).first',

		// Test `.shift()`
		// Not `CallExpression`
		'array.filter(foo).shift',
		// Not `MemberExpression`
		'shift(array.filter(foo))',
		// `callee.property` is not a `Identifier`
		'array.filter(foo)["shift"]()',
		// Computed
		'array.filter(foo)[shift]()',
		// Not `shift`
		'array.filter(foo).notShift()',
		// More or less argument(s)
		'array.filter(foo).shift(extraArgument)',
		'array.filter(foo).shift(...[])',

		// Test `const [item] = `
		// Not `VariableDeclarator`
		'[foo] = array.filter(bar)',
		// Not `ArrayPattern`
		'const foo = array.filter(bar)',
		'const {0: foo} = array.filter(bar)',
		// `elements`
		'const [] = array.filter(bar)',
		'const [foo, another] = array.filter(bar)',
		'const [, foo] = array.filter(bar)',
		'const [foo = bar] = array.filter(baz)',
		'const [{foo}] = array.filter(bar)',

		// Test `.filter()`
		// Not `CallExpression`
		'array.filter[0]',
		'array.filter.shift()',
		'const [foo] = array.filter',
		// Not `MemberExpression`
		'filter(foo)[0]',
		'filter(foo).shift()',
		'const [foo] = filter(bar)',
		// `callee.property` is not a `Identifier`
		'array["filter"](foo)[0]',
		'array["filter"](foo).shift()',
		'const [foo] = array["filter"](bar)',
		// Computed
		'array[filter](foo)[0]',
		'array[filter](foo).shift()',
		'const [foo] = array[filter](bar)',
		// Not `filter`
		'array.notFilter(foo)[0]',
		'array.notFilter(foo).shift()',
		'const [foo] = array.notFilter(bar)',
		// More or less argument(s)
		'array.filter()[0]',
		'array.filter(foo, thisArgument, extraArgument)[0]',
		'array.filter(...foo)[0]',
		'array.filter().shift()',
		'array.filter(foo, thisArgument, extraArgument).shift()',
		'array.filter(...foo).shift()',
		'const [foo] = array.filter()',
		'const [foo] = array.filter(bar, thisArgument, extraArgument)',
		'const [foo] = array.filter(...bar)'
	],
	invalid: [
		{
			code: 'array.filter(foo)[0]',
			output: 'array.find(foo)',
			errors: [{messageId: MESSAGE_ID_ZERO_INDEX}]
		},
		{
			code: 'array.filter(foo).shift()',
			output: 'array.find(foo)',
			errors: [{messageId: MESSAGE_ID_SHIFT}]
		},
		{
			code: 'const [foo] = array.filter(bar)',
			output: 'const foo = array.find(bar)',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING}]
		},
		{
			code: 'const [foo, ] = array.filter(bar)',
			output: 'const foo = array.find(bar)',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING}]
		},
		{
			code: 'var [foo, ] = array.filter(bar)',
			output: 'var foo = array.find(bar)',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING}]
		},
		{
			code: 'let [foo, ] = array.filter(bar)',
			output: 'let foo = array.find(bar)',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING}]
		},
		{
			code: 'let a = 1, [foo, ] = array.filter(bar)',
			output: 'let a = 1, foo = array.find(bar)',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING}]
		},
		{
			code: 'for (let [i] = array.filter(bar); i< 10; i++) {}',
			output: 'for (let i = array.find(bar); i< 10; i++) {}',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING}]
		},
		{
			code: 'array.filter(foo, thisArgument)[0]',
			output: 'array.find(foo, thisArgument)',
			errors: [{messageId: MESSAGE_ID_ZERO_INDEX}]
		},
		{
			code: 'array.filter(foo, thisArgument).shift()',
			output: 'array.find(foo, thisArgument)',
			errors: [{messageId: MESSAGE_ID_SHIFT}]
		},
		{
			code: 'const [foo] = array.filter(bar, thisArgument)',
			output: 'const foo = array.find(bar, thisArgument)',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING}]
		},
		{
			code: outdent`
				const item = array
					// comment 1
					.filter(
						// comment 2
						x => x === '🦄'
					)
					// comment 3
					.shift()
					// comment 4
					;
			`,
			output: outdent`
				const item = array
					// comment 1
					.find(
						// comment 2
						x => x === '🦄'
					)
					// comment 4
					;
			`,
			errors: [{messageId: MESSAGE_ID_SHIFT}]
		},
		{
			code: outdent`
				const [
					// comment 1
					item
					]
					// comment 2
					= array
					// comment 3
					.filter(
						// comment 4
						x => x === '🦄'
					)
					// comment 5
					;
			`,
			output: outdent`
				const item
					// comment 2
					= array
					// comment 3
					.find(
						// comment 4
						x => x === '🦄'
					)
					// comment 5
					;
			`,
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING}]
		}
	]
});
