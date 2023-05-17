import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const ERROR_ZERO_INDEX = 'error-zero-index';
const ERROR_SHIFT = 'error-shift';
const ERROR_POP = 'error-pop';
const ERROR_AT_MINUS_ONE = 'error-at-minus-one';
const ERROR_DESTRUCTURING_DECLARATION = 'error-destructuring-declaration';
const ERROR_DESTRUCTURING_ASSIGNMENT = 'error-destructuring-assignment';
const ERROR_DECLARATION = 'error-variable';

const SUGGESTION_NULLISH_COALESCING_OPERATOR = 'suggest-nullish-coalescing-operator';
const SUGGESTION_LOGICAL_OR_OPERATOR = 'suggest-logical-or-operator';

// `[0]`
test({
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
		'array.filter(...foo)[0]',
		// LHS
		'array.filter(foo)[0] += 1',
		'++ array.filter(foo)[0]',
		'array.filter(foo)[0]--',
		'delete array.filter(foo)[0]',
		'[array.filter(foo)[0] = 1] = []',
	],
	invalid: [
		{
			code: 'array.filter(foo)[0]',
			output: 'array.find(foo)',
			errors: [{messageId: ERROR_ZERO_INDEX}],
		},
		{
			code: 'array.filter(foo, thisArgument)[0]',
			output: 'array.find(foo, thisArgument)',
			errors: [{messageId: ERROR_ZERO_INDEX}],
		},
	],
});

// `.shift()`
test({
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
		'array.filter(...foo).shift()',
	],
	invalid: [
		{
			code: 'array.filter(foo).shift()',
			output: 'array.find(foo)',
			errors: [{messageId: ERROR_SHIFT}],
		},
		{
			code: 'array.filter(foo, thisArgument).shift()',
			output: 'array.find(foo, thisArgument)',
			errors: [{messageId: ERROR_SHIFT}],
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
			errors: [{messageId: ERROR_SHIFT}],
		},
	],
});

// `const [foo] =`
test({
	valid: [
		// Test `const [item] = …`
		// Not `VariableDeclarator`
		'function a([foo] = array.filter(bar1)) {}',
		// Not `ArrayPattern`
		'const foo = array.filter(bar)',
		'const items = array.filter(bar)', // Plural variable name.
		'const {0: foo} = array.filter(bar)',
		// `elements`
		'const [] = array.filter(bar)',
		'const [foo, another] = array.filter(bar)',
		'const [, foo] = array.filter(bar)',
		'const [,] = array.filter(bar)',
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
		'const [foo] = array.filter(...bar)',
	],
	invalid: [
		{
			code: 'const [foo] = array.filter(bar)',
			output: 'const foo = array.find(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		{
			// Plural variable name.
			code: 'const [items] = array.filter(bar)',
			output: 'const items = array.find(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		{
			code: 'const [foo] = array.filter(bar, thisArgument)',
			output: 'const foo = array.find(bar, thisArgument)',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		{
			code: 'const [{foo}] = array.filter(fn);',
			output: 'const {foo} = array.find(fn);',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		{
			code: 'const [{foo = bar}] = array.filter(fn);',
			output: 'const {foo = bar} = array.find(fn);',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		{
			code: 'const [[foo]] = array.filter(fn);',
			output: 'const [foo] = array.find(fn);',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		{
			code: 'const [[foo = bar]] = array.filter(fn);',
			output: 'const [foo = bar] = array.find(fn);',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		{
			code: 'const [foo, ] = array.filter(bar)',
			output: 'const foo = array.find(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		{
			code: 'var [foo, ] = array.filter(bar)',
			output: 'var foo = array.find(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		{
			code: 'let [foo, ] = array.filter(bar)',
			output: 'let foo = array.find(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		{
			code: 'let a = 1, [foo, ] = array.filter(bar)',
			output: 'let a = 1, foo = array.find(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		{
			code: 'let a = 1, [{foo}] = array.filter(bar)',
			output: 'let a = 1, {foo} = array.find(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		{
			code: 'for (let [i] = array.filter(bar); i< 10; i++) {}',
			output: 'for (let i = array.find(bar); i< 10; i++) {}',
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
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
			errors: [{messageId: ERROR_DESTRUCTURING_DECLARATION}],
		},
		// Suggestions
		{
			code: 'const [foo = baz] = array.filter(bar)',
			errors: [{
				messageId: ERROR_DESTRUCTURING_DECLARATION,
				suggestions: [
					{
						messageId: SUGGESTION_NULLISH_COALESCING_OPERATOR,
						output: 'const foo = array.find(bar) ?? baz',
					},
					{
						messageId: SUGGESTION_LOGICAL_OR_OPERATOR,
						output: 'const foo = array.find(bar) || baz',
					},
				],
			}],
		},
		// Default value is parenthesized
		{
			code: 'const [foo = (bar)] = array.filter(bar)',
			errors: [{
				messageId: ERROR_DESTRUCTURING_DECLARATION,
				suggestions: [
					{
						messageId: SUGGESTION_NULLISH_COALESCING_OPERATOR,
						output: 'const foo = array.find(bar) ?? (bar)',
					},
					{
						messageId: SUGGESTION_LOGICAL_OR_OPERATOR,
						output: 'const foo = array.find(bar) || (bar)',
					},
				],
			}],
		},
		// Default value has lower precedence
		{
			code: 'const [foo = a ? b : c] = array.filter(bar)',
			errors: [{
				messageId: ERROR_DESTRUCTURING_DECLARATION,
				suggestions: [
					{
						messageId: SUGGESTION_NULLISH_COALESCING_OPERATOR,
						output: 'const foo = array.find(bar) ?? (a ? b : c)',
					},
					{
						messageId: SUGGESTION_LOGICAL_OR_OPERATOR,
						output: 'const foo = array.find(bar) || (a ? b : c)',
					},
				],
			}],
		},
		{
			code: 'const [foo = a ?? b] = array.filter(bar)',
			errors: [{
				messageId: ERROR_DESTRUCTURING_DECLARATION,
				suggestions: [
					{
						messageId: SUGGESTION_NULLISH_COALESCING_OPERATOR,
						output: 'const foo = array.find(bar) ?? (a ?? b)',
					},
					{
						messageId: SUGGESTION_LOGICAL_OR_OPERATOR,
						output: 'const foo = array.find(bar) || (a ?? b)',
					},
				],
			}],
		},
		{
			code: 'const [foo = a || b] = array.filter(bar)',
			errors: [{
				messageId: ERROR_DESTRUCTURING_DECLARATION,
				suggestions: [
					{
						messageId: SUGGESTION_NULLISH_COALESCING_OPERATOR,
						output: 'const foo = array.find(bar) ?? (a || b)',
					},
					{
						messageId: SUGGESTION_LOGICAL_OR_OPERATOR,
						output: 'const foo = array.find(bar) || (a || b)',
					},
				],
			}],
		},
		{
			code: 'const [foo = a && b] = array.filter(bar)',
			errors: [{
				messageId: ERROR_DESTRUCTURING_DECLARATION,
				suggestions: [
					{
						messageId: SUGGESTION_NULLISH_COALESCING_OPERATOR,
						output: 'const foo = array.find(bar) ?? (a && b)',
					},
					{
						messageId: SUGGESTION_LOGICAL_OR_OPERATOR,
						output: 'const foo = array.find(bar) || a && b',
					},
				],
			}],
		},
	],
});

// `[foo] =`
test({
	valid: [
		// Test `[item] = …`
		// Not `AssignmentExpression`
		'function a([foo] = array.filter(bar)) {}',
		// Not `ArrayPattern`
		'foo = array.filter(bar)',
		'items = array.filter(bar)', // Plural variable name.
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
		'[foo] = array.filter(...bar)',
	],
	invalid: [
		{
			code: '[foo] = array.filter(bar)',
			output: 'foo = array.find(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_ASSIGNMENT}],
		},
		{
			code: '[foo] = array.filter(bar, thisArgument)',
			output: 'foo = array.find(bar, thisArgument)',
			errors: [{messageId: ERROR_DESTRUCTURING_ASSIGNMENT}],
		},
		{
			code: '[foo.bar().baz] = array.filter(fn)',
			output: 'foo.bar().baz = array.find(fn)',
			errors: [{messageId: ERROR_DESTRUCTURING_ASSIGNMENT}],
		},
		{
			code: '[{foo}] = array.filter(fn);',
			output: '({foo} = array.find(fn));',
			errors: [{messageId: ERROR_DESTRUCTURING_ASSIGNMENT}],
		},
		{
			code: '[[foo]] = array.filter(fn);',
			output: '[foo] = array.find(fn);',
			errors: [{messageId: ERROR_DESTRUCTURING_ASSIGNMENT}],
		},
		{
			code: '[{foo = baz}] = array.filter(fn);',
			output: '({foo = baz} = array.find(fn));',
			errors: [{messageId: ERROR_DESTRUCTURING_ASSIGNMENT}],
		},
		{
			code: '[foo, ] = array.filter(bar)',
			output: 'foo = array.find(bar)',
			errors: [{messageId: ERROR_DESTRUCTURING_ASSIGNMENT}],
		},
		{
			code: 'for ([i] = array.filter(bar); i< 10; i++) {}',
			output: 'for (i = array.find(bar); i< 10; i++) {}',
			errors: [{messageId: ERROR_DESTRUCTURING_ASSIGNMENT}],
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
			errors: [{messageId: ERROR_DESTRUCTURING_ASSIGNMENT}],
		},
		// Suggestions
		{
			code: '[foo = baz] = array.filter(bar)',
			errors: [{
				messageId: ERROR_DESTRUCTURING_ASSIGNMENT,
				suggestions: [
					{
						messageId: SUGGESTION_NULLISH_COALESCING_OPERATOR,
						output: 'foo = array.find(bar) ?? baz',
					},
					{
						messageId: SUGGESTION_LOGICAL_OR_OPERATOR,
						output: 'foo = array.find(bar) || baz',
					},
				],
			}],
		},
		{
			code: '[{foo} = baz] = array.filter(bar)',
			errors: [{
				messageId: ERROR_DESTRUCTURING_ASSIGNMENT,
				suggestions: [
					{
						messageId: SUGGESTION_NULLISH_COALESCING_OPERATOR,
						output: '({foo} = array.find(bar) ?? baz)',
					},
					{
						messageId: SUGGESTION_LOGICAL_OR_OPERATOR,
						output: '({foo} = array.find(bar) || baz)',
					},
				],
			}],
		},
		{
			code: ';([{foo} = baz] = array.filter(bar))',
			errors: [{
				messageId: ERROR_DESTRUCTURING_ASSIGNMENT,
				suggestions: [
					{
						messageId: SUGGESTION_NULLISH_COALESCING_OPERATOR,
						output: ';({foo} = array.find(bar) ?? baz)',
					},
					{
						messageId: SUGGESTION_LOGICAL_OR_OPERATOR,
						output: ';({foo} = array.find(bar) || baz)',
					},
				],
			}],
		},
		// Default value is parenthesized
		{
			code: '[foo = (bar)] = array.filter(bar)',
			errors: [{
				messageId: ERROR_DESTRUCTURING_ASSIGNMENT,
				suggestions: [
					{
						messageId: SUGGESTION_NULLISH_COALESCING_OPERATOR,
						output: 'foo = array.find(bar) ?? (bar)',
					},
					{
						messageId: SUGGESTION_LOGICAL_OR_OPERATOR,
						output: 'foo = array.find(bar) || (bar)',
					},
				],
			}],
		},
		// Default value has lower precedence
		{
			code: '[foo = a ? b : c] = array.filter(bar)',
			errors: [{
				messageId: ERROR_DESTRUCTURING_ASSIGNMENT,
				suggestions: [
					{
						messageId: SUGGESTION_NULLISH_COALESCING_OPERATOR,
						output: 'foo = array.find(bar) ?? (a ? b : c)',
					},
					{
						messageId: SUGGESTION_LOGICAL_OR_OPERATOR,
						output: 'foo = array.find(bar) || (a ? b : c)',
					},
				],
			}],
		},
		{
			code: '[foo = a || b] = array.filter(bar)',
			errors: [{
				messageId: ERROR_DESTRUCTURING_ASSIGNMENT,
				suggestions: [
					{
						messageId: SUGGESTION_NULLISH_COALESCING_OPERATOR,
						output: 'foo = array.find(bar) ?? (a || b)',
					},
					{
						messageId: SUGGESTION_LOGICAL_OR_OPERATOR,
						output: 'foo = array.find(bar) || (a || b)',
					},
				],
			}],
		},
	],
});

// `const foo = array.filter(); foo[0]; [bar] = foo`
test({
	valid: [
		'const foo = array.find(bar), first = foo[0];',
		'const foo = array.filter(bar), first = notFoo[0];',
		'const foo = array.filter(bar), first = foo[+0];',
		'const foo = array.filter(bar); first = foo;',
		'const foo = array.filter(bar), first = a[foo][0];',
		'const foo = array.filter(bar), first = foo[-0];',
		'const foo = array.filter(bar), first = foo[1-1];',
		'const foo = array.filter(bar), first = foo["0"];',
		'const foo = array.filter(bar), first = foo.first;',
		'foo = array.filter(bar); const first = foo[+0];',
		'const {foo} = array.filter(bar), first = foo[0];',
		outdent`
			const foo = array.filter(bar);
			doSomething(foo);
			const first = foo[0];
		`,
		outdent`
			var foo = array.filter(bar);
			var foo = array.filter(bar);
			const first = foo[0];
		`,
		outdent`
			export const foo = array.filter(bar);
			const first = foo[0];
		`,

		'const foo = array.find(bar); const [first] = foo;',
		'const foo = array.find(bar); [first] = foo;',
		'const foo = array.filter(bar); const [first] = notFoo;',
		'const foo = array.filter(bar); [first] = notFoo;',
		'const foo = array.filter(bar); const first = foo;',
		'const foo = array.filter(bar); first = foo;',
		'const foo = array.filter(bar); const {0: first} = foo;',
		'const foo = array.filter(bar); ({0: first} = foo);',
		'const foo = array.filter(bar); const [] = foo;',
		'const foo = array.filter(bar); const [first, another] = foo;',
		'const foo = array.filter(bar); [first, another] = foo;',
		'const foo = array.filter(bar); const [,first] = foo;',
		'const foo = array.filter(bar); [,first] = foo;',
		'const foo = array.filter(bar); const [...first] = foo;',
		'const foo = array.filter(bar); [...first] = foo;',
		outdent`
			const foo = array.filter(bar);
			function a([bar] = foo) {}
		`,

		// Test `.filter()`
		// Not `CallExpression`
		'const foo = array.filter; const first = foo[0]',
		// Not `MemberExpression`
		'const foo = filter(bar); const first = foo[0]',
		// `callee.property` is not a `Identifier`
		'const foo = array["filter"](bar); const first = foo[0]',
		// Computed
		'const foo = array[filter](bar); const first = foo[0]',
		// Not `filter`
		'const foo = array.notFilter(bar); const first = foo[0]',
		// More or less argument(s)
		'const foo = array.filter(); const first = foo[0]',
		'const foo = array.filter(bar, thisArgument, extraArgument); const first = foo[0]',
		'const foo = array.filter(...bar); const first = foo[0]',

		// Singularization
		'const item = array.find(bar), first = item;', // Already singular variable name.
		'let items = array.filter(bar); console.log(items[0]); items = [1,2,3]; console.log(items[0]);', // Reassigning array variable.
	],
	invalid: [
		{
			code: 'const foo = array.filter(bar); const first = foo[0];',
			output: 'const foo = array.find(bar); const first = foo;',
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			code: 'const foo = array.filter(bar), first = foo[0];',
			output: 'const foo = array.find(bar), first = foo;',
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			code: 'var foo = array.filter(bar), first = foo[0];',
			output: 'var foo = array.find(bar), first = foo;',
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			code: 'let foo = array.filter(bar), first = foo[0];',
			output: 'let foo = array.find(bar), first = foo;',
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			code: 'const foo = array.filter(bar); const [first] = foo;',
			output: 'const foo = array.find(bar); const first = foo;',
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			code: 'const foo = array.filter(bar); [first] = foo;',
			output: 'const foo = array.find(bar); first = foo;',
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			code: 'const foo = array.filter(bar); const [{propOfFirst = unicorn}] = foo;',
			output: 'const foo = array.find(bar); const {propOfFirst = unicorn} = foo;',
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			code: 'const foo = array.filter(bar); [{propOfFirst = unicorn}] = foo;',
			output: 'const foo = array.find(bar); ({propOfFirst = unicorn} = foo);',
			errors: [{messageId: ERROR_DECLARATION}],
		},

		// Singularization
		{
			// Multiple usages and child scope.
			code: outdent`
				const items = array.filter(bar);
				const first = items[0];
				console.log(items[0]);
				function foo() { return items[0]; }
			`,
			output: outdent`
				const item = array.find(bar);
				const first = item;
				console.log(item);
				function foo() { return item; }
			`,
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			// Variable name collision.
			code: 'const item = {}; const items = array.filter(bar); console.log(items[0]);',
			output: 'const item = {}; const item_ = array.find(bar); console.log(item_);',
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			// Variable defined with `let`.
			code: 'let items = array.filter(bar); console.log(items[0]);',
			output: 'let item = array.find(bar); console.log(item);',
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			code: outdent`
				const item = 1;
				function f() {
					const items = array.filter(bar);
					console.log(items[0]);
				}
			`,
			output: outdent`
				const item = 1;
				function f() {
					const item_ = array.find(bar);
					console.log(item_);
				}
			`,
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			code: outdent`
				const items = array.filter(bar);
				function f() {
					const item = 1;
					const item_ = 2;
					console.log(items[0]);
				}
			`,
			output: outdent`
				const item__ = array.find(bar);
				function f() {
					const item = 1;
					const item_ = 2;
					console.log(item__);
				}
			`,
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			code: outdent`
				const items = array.filter(bar);
				function f() {
					console.log(items[0], item);
				}
			`,
			output: outdent`
				const item_ = array.find(bar);
				function f() {
					console.log(item_, item);
				}
			`,
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			code: outdent`
				const items = array.filter(bar);
				console.log(items[0]);
				function f(item) {
					return item;
				}
			`,
			output: outdent`
				const item_ = array.find(bar);
				console.log(item_);
				function f(item) {
					return item;
				}
			`,
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			code: outdent`
				function f() {
					const items = array.filter(bar);
					console.log(items[0]);
				}
				function f2(item) {
					return item;
				}
			`,
			output: outdent`
				function f() {
					const item = array.find(bar);
					console.log(item);
				}
				function f2(item) {
					return item;
				}
			`,
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			code: outdent`
				const packages = array.filter(bar);
				console.log(packages[0]);
			`,
			output: outdent`
				const package_ = array.find(bar);
				console.log(package_);
			`,
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			code: outdent`
				const symbols = array.filter(bar);
				console.log(symbols[0]);
			`,
			output: outdent`
				const symbol_ = array.find(bar);
				console.log(symbol_);
			`,
			errors: [{messageId: ERROR_DECLARATION}],
		},

		// Not fixable
		{
			code: 'const foo = array.filter(bar); const [first = bar] = foo;',
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			code: 'const foo = array.filter(bar); [first = bar] = foo;',
			errors: [{messageId: ERROR_DECLARATION}],
		},
		// Many
		{
			code: 'let foo = array.filter(bar);foo[0](foo[0])[foo[0]];',
			output: 'let foo = array.find(bar);foo(foo)[foo];',
			errors: [{messageId: ERROR_DECLARATION}],
		},
		{
			code: outdent`
				let baz;
				const foo = array.filter(bar);
				const [bar] = foo;
				[{bar}] = foo;
				function getValueOfFirst() {
					return foo[0].value;
				}
				function getPropertyOfFirst(property) {
					return foo[0][property];
				}
			`,
			output: outdent`
				let baz;
				const foo = array.find(bar);
				const bar = foo;
				({bar} = foo);
				function getValueOfFirst() {
					return foo.value;
				}
				function getPropertyOfFirst(property) {
					return foo[property];
				}
			`,
			errors: [{messageId: ERROR_DECLARATION}],
		},
	],
});

// Mixed
test({
	valid: [],
	invalid: [
		{
			code: outdent`
				const quz = array.filter(fn);
				const [foo] = array.filter(quz[0]);
				[{bar: baz}] = foo[
					array.filter(fn)[0]
				].filter(
					array.filter(fn).shift()
				);
			`,
			// Eslint can't fix all of them,
			// But run test on this again will fix to correct code,
			// See next test
			output: outdent`
				const quz = array.find(fn);
				const [foo] = array.filter(quz);
				({bar: baz} = foo[
					array.filter(fn)[0]
				].find(
					array.filter(fn).shift()
				));
			`,
			errors: [
				{messageId: ERROR_DECLARATION},
				{messageId: ERROR_DESTRUCTURING_DECLARATION},
				{messageId: ERROR_ZERO_INDEX},
				{messageId: ERROR_DESTRUCTURING_ASSIGNMENT},
				{messageId: ERROR_SHIFT},
			],
		},
		{
			// This code from previous output
			code: outdent`
				const quz = array.find(fn);
				const [foo] = array.filter(quz);
				({bar: baz} = foo[
					array.filter(fn)[0]
				].find(
					array.filter(fn).shift()
				));
			`,
			output: outdent`
				const quz = array.find(fn);
				const foo = array.find(quz);
				({bar: baz} = foo[
					array.find(fn)
				].find(
					array.find(fn)
				));
			`,
			errors: [
				{messageId: ERROR_DESTRUCTURING_DECLARATION},
				{messageId: ERROR_ZERO_INDEX},
				{messageId: ERROR_SHIFT},
			],
		},
	],
});

// Check from last
const checkFromLastOptions = [{checkFromLast: true}];

// Default to false
test({
	valid: [
		'array.filter(foo).pop()',
		'array.filter(foo).at(-1)',
	],
	invalid: [],
});

// `.pop()`
test({
	valid: [
		// Test `.pop()`
		// Not `CallExpression`
		'array.filter(foo).pop',
		// Not `MemberExpression`
		'pop(array.filter(foo))',
		// `callee.property` is not a `Identifier`
		'array.filter(foo)["pop"]()',
		// Computed
		'array.filter(foo)[pop]()',
		// Not `pop`
		'array.filter(foo).notPop()',
		// More or less argument(s)
		'array.filter(foo).pop(extraArgument)',
		'array.filter(foo).pop(...[])',

		// Test `.filter()`
		// Not `CallExpression`
		'array.filter.pop()',
		// Not `MemberExpression`
		'filter(foo).pop()',
		// `callee.property` is not a `Identifier`
		'array["filter"](foo).pop()',
		// Computed
		'array[filter](foo).pop()',
		// Not `filter`
		'array.notFilter(foo).pop()',
		// More or less argument(s)
		'array.filter().pop()',
		'array.filter(foo, thisArgument, extraArgument).pop()',
		'array.filter(...foo).pop()',
	].map(code => ({code, options: checkFromLastOptions})),
	invalid: [
		{
			code: 'array.filter(foo).pop()',
			output: 'array.findLast(foo)',
			errors: [{messageId: ERROR_POP}],
		},
		{
			code: 'array.filter(foo, thisArgument).pop()',
			output: 'array.findLast(foo, thisArgument)',
			errors: [{messageId: ERROR_POP}],
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
					.pop()
					// comment 4
					;
			`,
			output: outdent`
				const item = array
					// comment 1
					.findLast(
						// comment 2
						x => x === '🦄'
					)
					// comment 4
					;
			`,
			errors: [{messageId: ERROR_POP}],
		},
	].map(test => ({...test, options: checkFromLastOptions})),
});

// `.at(-1)`
test({
	valid: [
		// Test `.at()`
		// Not `CallExpression`
		'array.filter(foo).at',
		// Not `MemberExpression`
		'at(array.filter(foo), -1)',
		// `callee.property` is not a `Identifier`
		'array.filter(foo)["at"](-1)',
		// Computed
		'array.filter(foo)[at](-1)',
		// Not `at`
		'array.filter(foo).notAt(-1)',
		// More or less argument(s)
		'array.filter(foo).at()',
		'array.filter(foo).at(-1, extraArgument)',
		'array.filter(foo).at(...[-1])',

		// Test `-1`
		'array.filter(foo).at(1)',
		'array.filter(foo).at(+1)',
		'const ONE = 1; array.filter(foo).at(-ONE)',
		'const MINUS_ONE = 1; array.filter(foo).at(MINUS_ONE)',
		'const a = {b: 1}; array.filter(foo).at(-a.b)',
		'const a = {b: -1}; array.filter(foo).at(a.b)',
		'array.filter(foo).at(-2)',
		'array.filter(foo).at(-(-1))',
		'array.filter(foo).at(-1.)',
		'array.filter(foo).at(-0b1)',
		'array.filter(foo).at(-"1")',
		'array.filter(foo).at(-null)',
		'array.filter(foo).at(-false)',
		'array.filter(foo).at(-true)',

		// Test `.filter()`
		// Not `CallExpression`
		'array.filter.at(-1)',
		// Not `MemberExpression`
		'filter(foo).at(-1)',
		// `callee.property` is not a `Identifier`
		'array["filter"](foo).at(-1)',
		// Computed
		'array[filter](foo).at(-1)',
		// Not `filter`
		'array.notFilter(foo).at(-1)',
		// More or less argument(s)
		'array.filter().at(-1)',
		'array.filter(foo, thisArgument, extraArgument).at(-1)',
		'array.filter(...foo).at(-1)',
	].map(code => ({code, options: checkFromLastOptions})),
	invalid: [
		{
			code: 'array.filter(foo).at(-1)',
			output: 'array.findLast(foo)',
			errors: [{messageId: ERROR_AT_MINUS_ONE}],
		},
		{
			code: 'array.filter(foo, thisArgument).at(-1)',
			output: 'array.findLast(foo, thisArgument)',
			errors: [{messageId: ERROR_AT_MINUS_ONE}],
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
					.at(
						// comment 4
						-1
						// comment 5
					)
					// comment 6
					;
			`,
			output: outdent`
				const item = array
					// comment 1
					.findLast(
						// comment 2
						x => x === '🦄'
					)
					// comment 6
					;
			`,
			errors: [{messageId: ERROR_AT_MINUS_ONE}],
		},
	].map(test => ({...test, options: checkFromLastOptions})),
});
