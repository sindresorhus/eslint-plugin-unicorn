import test from 'ava';
import {outdent} from 'outdent';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-array-find';

const MESSAGE_ID_ZERO_INDEX = 'prefer-array-find-over-filter-zero-index';
const MESSAGE_ID_SHIFT = 'prefer-array-find-over-filter-shift';
const MESSAGE_ID_DESTRUCTURING_DECLARATION = 'prefer-array-find-over-filter-destructuring-declaration';
const MESSAGE_ID_DESTRUCTURING_ASSIGNMENT = 'prefer-array-find-over-filter-destructuring-assignment';
const MESSAGE_ID_USE_NULLISH_COALESCING_OPERATOR = 'use-nullish-coalescing-operator';
const MESSAGE_ID_USE_LOGICAL_OR_OPERATOR = 'use-logical-or-operator';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

// `[0]`
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

		// Test `.filter()`
		// Not `CallExpression`
		'array.filter[0]',
		// Not `MemberExpression`
		'filter(foo)[0]',
		// `callee.property` is not a `Identifier`
		'array["filter"](foo)[0]',
		// Computed
		'array[filter](foo)[0]',
		// Not `filter`
		'array.notFilter(foo)[0]',
		// More or less argument(s)
		'array.filter()[0]',
		'array.filter(foo, thisArgument, extraArgument)[0]',
		'array.filter(...foo)[0]'
	],
	invalid: [
		{
			code: 'array.filter(foo)[0]',
			output: 'array.find(foo)',
			errors: [{messageId: MESSAGE_ID_ZERO_INDEX}]
		},
		{
			code: 'array.filter(foo, thisArgument)[0]',
			output: 'array.find(foo, thisArgument)',
			errors: [{messageId: MESSAGE_ID_ZERO_INDEX}]
		}
	]
});

// `.shift()`
ruleTester.run('prefer-array-find', rule, {
	valid: [
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
		'array.filter.shift()',
		// Not `MemberExpression`
		'filter(foo).shift()',
		// `callee.property` is not a `Identifier`
		'array["filter"](foo).shift()',
		// Computed
		'array[filter](foo).shift()',
		// Not `filter`
		'array.notFilter(foo).shift()',
		// More or less argument(s)
		'array.filter().shift()',
		'array.filter(foo, thisArgument, extraArgument).shift()',
		'array.filter(...foo).shift()'
	],
	invalid: [
		{
			code: 'array.filter(foo).shift()',
			output: 'array.find(foo)',
			errors: [{messageId: MESSAGE_ID_SHIFT}]
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
// `const [foo] =`

ruleTester.run('prefer-array-find', rule, {
	valid: [
		// Test `const [item] = …`
		// Not `VariableDeclarator`
		'function a([foo] = array.filter(bar)) {}',
		// Not `ArrayPattern`
		'const foo = array.filter(bar)',
		'const {0: foo} = array.filter(bar)',
		// `elements`
		'const [] = array.filter(bar)',
		'const [foo, another] = array.filter(bar)',
		'const [, foo] = array.filter(bar)',
		// `RestElement`
		'const [...foo] = array.filter(bar)',

		// Test `.filter()`
		// Not `CallExpression`
		'const [foo] = array.filter',
		// Not `MemberExpression`
		'const [foo] = filter(bar)',
		// `callee.property` is not a `Identifier`
		'const [foo] = array["filter"](bar)',
		// Computed
		'const [foo] = array[filter](bar)',
		// Not `filter`
		'const [foo] = array.notFilter(bar)',
		// More or less argument(s)
		'const [foo] = array.filter()',
		'const [foo] = array.filter(bar, thisArgument, extraArgument)',
		'const [foo] = array.filter(...bar)'
	],
	invalid: [
		{
			code: 'const [foo] = array.filter(bar)',
			output: 'const foo = array.find(bar)',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION}]
		},
		{
			code: 'const [foo] = array.filter(bar, thisArgument)',
			output: 'const foo = array.find(bar, thisArgument)',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION}]
		},
		{
			code: 'const [{foo}] = array.filter(fn);',
			output: 'const {foo} = array.find(fn);',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION}]
		},
		{
			code: 'const [{foo = bar}] = array.filter(fn);',
			output: 'const {foo = bar} = array.find(fn);',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION}]
		},
		{
			code: 'const [[foo]] = array.filter(fn);',
			output: 'const [foo] = array.find(fn);',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION}]
		},
		{
			code: 'const [[foo = bar]] = array.filter(fn);',
			output: 'const [foo = bar] = array.find(fn);',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION}]
		},
		{
			code: 'const [foo, ] = array.filter(bar)',
			output: 'const foo = array.find(bar)',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION}]
		},
		{
			code: 'var [foo, ] = array.filter(bar)',
			output: 'var foo = array.find(bar)',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION}]
		},
		{
			code: 'let [foo, ] = array.filter(bar)',
			output: 'let foo = array.find(bar)',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION}]
		},
		{
			code: 'let a = 1, [foo, ] = array.filter(bar)',
			output: 'let a = 1, foo = array.find(bar)',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION}]
		},
		{
			code: 'let a = 1, [{foo}] = array.filter(bar)',
			output: 'let a = 1, {foo} = array.find(bar)',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION}]
		},
		{
			code: 'for (let [i] = array.filter(bar); i< 10; i++) {}',
			output: 'for (let i = array.find(bar); i< 10; i++) {}',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION}]
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
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION}]
		},
		// Suggestions
		{
			code: 'const [foo = baz] = array.filter(bar)',
			output: 'const [foo = baz] = array.filter(bar)',
			errors: [{
				messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION,
				suggestions: [
					{
						messageId: MESSAGE_ID_USE_NULLISH_COALESCING_OPERATOR,
						output: 'const foo = array.find(bar) ?? baz'
					},
					{
						messageId: MESSAGE_ID_USE_LOGICAL_OR_OPERATOR,
						output: 'const foo = array.find(bar) || baz'
					}
				]
			}]
		},
		// Default value is parenthesized
		{
			code: 'const [foo = (bar)] = array.filter(bar)',
			output: 'const [foo = (bar)] = array.filter(bar)',
			errors: [{
				messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION,
				suggestions: [
					{
						messageId: MESSAGE_ID_USE_NULLISH_COALESCING_OPERATOR,
						output: 'const foo = array.find(bar) ?? (bar)'
					},
					{
						messageId: MESSAGE_ID_USE_LOGICAL_OR_OPERATOR,
						output: 'const foo = array.find(bar) || (bar)'
					}
				]
			}]
		},
		// Default value has higher precedence
		{
			code: 'const [foo = a ? b : c] = array.filter(bar)',
			output: 'const [foo = a ? b : c] = array.filter(bar)',
			errors: [{
				messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION,
				suggestions: [
					{
						messageId: MESSAGE_ID_USE_NULLISH_COALESCING_OPERATOR,
						output: 'const foo = array.find(bar) ?? (a ? b : c)'
					},
					{
						messageId: MESSAGE_ID_USE_LOGICAL_OR_OPERATOR,
						output: 'const foo = array.find(bar) || (a ? b : c)'
					}
				]
			}]
		},
		{
			code: 'const [foo = a || b] = array.filter(bar)',
			output: 'const [foo = a || b] = array.filter(bar)',
			errors: [{
				messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION,
				suggestions: [
					{
						messageId: MESSAGE_ID_USE_NULLISH_COALESCING_OPERATOR,
						output: 'const foo = array.find(bar) ?? (a || b)'
					},
					{
						messageId: MESSAGE_ID_USE_LOGICAL_OR_OPERATOR,
						output: 'const foo = array.find(bar) || (a || b)'
					}
				]
			}]
		}
	]
});

// `[foo] =`
ruleTester.run('prefer-array-find', rule, {
	valid: [
		// Test `[item] = …`
		// Not `AssignmentExpression`
		'function a([foo] = array.filter(bar)) {}',
		// Not `ArrayPattern`
		'foo = array.filter(bar)',
		'({foo} = array.filter(bar))',
		// `elements`
		'[] = array.filter(bar)',
		'[foo, another] = array.filter(bar)',
		'[, foo] = array.filter(bar)',
		// `RestElement`
		'[...foo] = array.filter(bar)',

		// Test `.filter()`
		// Not `CallExpression`
		'[foo] = array.filter',
		// Not `MemberExpression`
		'[foo] = filter(bar)',
		// `callee.property` is not a `Identifier`
		'[foo] = array["filter"](bar)',
		// Computed
		'[foo] = array[filter](bar)',
		// Not `filter`
		'[foo] = array.notFilter(bar)',
		// More or less argument(s)
		'[foo] = array.filter()',
		'[foo] = array.filter(bar, thisArgument, extraArgument)',
		'[foo] = array.filter(...bar)'
	],
	invalid: [
		{
			code: '[foo] = array.filter(bar)',
			output: 'foo = array.find(bar)',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT}]
		},
		{
			code: '[foo] = array.filter(bar, thisArgument)',
			output: 'foo = array.find(bar, thisArgument)',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT}]
		},
		{
			code: '[foo.bar().baz] = array.filter(fn)',
			output: 'foo.bar().baz = array.find(fn)',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT}]
		},
		{
			code: '[{foo}] = array.filter(fn);',
			output: '({foo} = array.find(fn));',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT}]
		},
		{
			code: '[[foo]] = array.filter(fn);',
			output: '[foo] = array.find(fn);',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT}]
		},
		{
			code: '[{foo = baz}] = array.filter(fn);',
			output: '({foo = baz} = array.find(fn));',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT}]
		},
		{
			code: '[foo, ] = array.filter(bar)',
			output: 'foo = array.find(bar)',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT}]
		},
		{
			code: 'for ([i] = array.filter(bar); i< 10; i++) {}',
			output: 'for (i = array.find(bar); i< 10; i++) {}',
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT}]
		},
		// `no-semi` style
		{
			code: outdent`
				let foo
				const bar = []
				;[foo] = array.filter(bar)
			`,
			output: outdent`
				let foo
				const bar = []
				;foo = array.find(bar)
			`,
			errors: [{messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT}]
		},
		// Suggestions
		{
			code: '[foo = baz] = array.filter(bar)',
			output: '[foo = baz] = array.filter(bar)',
			errors: [{
				messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT,
				suggestions: [
					{
						messageId: MESSAGE_ID_USE_NULLISH_COALESCING_OPERATOR,
						output: 'foo = array.find(bar) ?? baz'
					},
					{
						messageId: MESSAGE_ID_USE_LOGICAL_OR_OPERATOR,
						output: 'foo = array.find(bar) || baz'
					}
				]
			}]
		},
		{
			code: '[{foo} = baz] = array.filter(bar)',
			output: '[{foo} = baz] = array.filter(bar)',
			errors: [{
				messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT,
				suggestions: [
					{
						messageId: MESSAGE_ID_USE_NULLISH_COALESCING_OPERATOR,
						output: '({foo} = array.find(bar) ?? baz)'
					},
					{
						messageId: MESSAGE_ID_USE_LOGICAL_OR_OPERATOR,
						output: '({foo} = array.find(bar) || baz)'
					}
				]
			}]
		},
		{
			code: ';([{foo} = baz] = array.filter(bar))',
			output: ';([{foo} = baz] = array.filter(bar))',
			errors: [{
				messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT,
				suggestions: [
					{
						messageId: MESSAGE_ID_USE_NULLISH_COALESCING_OPERATOR,
						output: ';({foo} = array.find(bar) ?? baz)'
					},
					{
						messageId: MESSAGE_ID_USE_LOGICAL_OR_OPERATOR,
						output: ';({foo} = array.find(bar) || baz)'
					}
				]
			}]
		},
		// Default value is parenthesized
		{
			code: '[foo = (bar)] = array.filter(bar)',
			output: '[foo = (bar)] = array.filter(bar)',
			errors: [{
				messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT,
				suggestions: [
					{
						messageId: MESSAGE_ID_USE_NULLISH_COALESCING_OPERATOR,
						output: 'foo = array.find(bar) ?? (bar)'
					},
					{
						messageId: MESSAGE_ID_USE_LOGICAL_OR_OPERATOR,
						output: 'foo = array.find(bar) || (bar)'
					}
				]
			}]
		},
		// Default value has higher precedence
		{
			code: '[foo = a ? b : c] = array.filter(bar)',
			output: '[foo = a ? b : c] = array.filter(bar)',
			errors: [{
				messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT,
				suggestions: [
					{
						messageId: MESSAGE_ID_USE_NULLISH_COALESCING_OPERATOR,
						output: 'foo = array.find(bar) ?? (a ? b : c)'
					},
					{
						messageId: MESSAGE_ID_USE_LOGICAL_OR_OPERATOR,
						output: 'foo = array.find(bar) || (a ? b : c)'
					}
				]
			}]
		},
		{
			code: '[foo = a || b] = array.filter(bar)',
			output: '[foo = a || b] = array.filter(bar)',
			errors: [{
				messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT,
				suggestions: [
					{
						messageId: MESSAGE_ID_USE_NULLISH_COALESCING_OPERATOR,
						output: 'foo = array.find(bar) ?? (a || b)'
					},
					{
						messageId: MESSAGE_ID_USE_LOGICAL_OR_OPERATOR,
						output: 'foo = array.find(bar) || (a || b)'
					}
				]
			}]
		}
	]
});

// Mixed
ruleTester.run('prefer-array-find', rule, {
	valid: [],
	invalid: [
		{
			code: outdent`
				const [foo] = array.filter(fn);
				[{bar: baz}] = foo[
					array.filter(fn)[0]
				].filter(
					array.filter(fn).shift()
				);
			`,
			// I don't know why eslint can't fix all of them,
			// But run test on this again will fix to correct code,
			// See next test
			output: outdent`
				const foo = array.find(fn);
				({bar: baz} = foo[
					array.filter(fn)[0]
				].find(
					array.filter(fn).shift()
				));
			`,
			errors: [
				{messageId: MESSAGE_ID_DESTRUCTURING_DECLARATION},
				{messageId: MESSAGE_ID_DESTRUCTURING_ASSIGNMENT},
				{messageId: MESSAGE_ID_ZERO_INDEX},
				{messageId: MESSAGE_ID_SHIFT}
			]
		},
		{
			// This code from previous output
			code: outdent`
				const foo = array.find(fn);
				({bar: baz} = foo[
					array.filter(fn)[0]
				].find(
					array.filter(fn).shift()
				));
			`,
			output: outdent`
				const foo = array.find(fn);
				({bar: baz} = foo[
					array.find(fn)
				].find(
					array.find(fn)
				));
			`,
			errors: [
				{messageId: MESSAGE_ID_ZERO_INDEX},
				{messageId: MESSAGE_ID_SHIFT}
			]
		}
	]
});
