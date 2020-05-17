import test from 'ava';
import {outdent} from 'outdent';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-find';

const MESSAGE_ID_ZERO_INDEX = 'prefer-find-over-filter-zero-index';
const MESSAGE_ID_SHIFT = 'prefer-find-over-filter-shift';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

ruleTester.run('prefer-find', rule, {
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

		// Test `.filter()`
		// Not `CallExpression`
		'array.filter[0]',
		'array.filter.shift()',
		// Not `MemberExpression`
		'filter(foo)[0]',
		'filter(foo).shift()',
		// `callee.property` is not a `Identifier`
		'array["filter"](foo)[0]',
		'array["filter"](foo).shift()',
		// Computed
		'array[filter](foo)[0]',
		'array[filter](foo).shift()',
		// Not `filter`
		'array.notFilter(foo)[0]',
		'array.notFilter(foo).shift()',
		// More or less argument(s)
		'array.filter()[0]',
		'array.filter(foo, thisArgument, extraArgument)[0]',
		'array.filter(...foo)[0]',
		'array.filter().shift()',
		'array.filter(foo, thisArgument, extraArgument).shift()',
		'array.filter(...foo).shift()'
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
		}
	]
});
