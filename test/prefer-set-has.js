import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/prefer-set-has';

const ruleId = 'prefer-set-has';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module'
	}
});

const createError = name => [
	{
		messageId: 'preferSetHas',
		data: {
			name
		}
	}
];

const methodsReturnsArray = [
	'concat',
	'copyWithin',
	'fill',
	'filter',
	'flat',
	'flatMap',
	'map',
	'reverse',
	'slice',
	'sort',
	'splice'
];

ruleTester.run(ruleId, rule, {
	valid: [
		outdent`
			const foo = new Set([1, 2, 3]);
			const exists = foo.has(1);
		`,
		// Not `VariableDeclarator`
		outdent`
			foo = [1, 2, 3];
			const exists = foo.includes(1);
		`,
		outdent`
			const exists = foo.includes(1);
		`,
		outdent`
			const exists = [1, 2, 3].includes(1);
		`,
		// Didn't call `includes()`
		outdent`
			const foo = [1, 2, 3];
		`,
		// Not `CallExpression`
		outdent`
			const foo = [1, 2, 3];
			const exists = foo.includes;
		`,
		// Not `foo.includes()`
		outdent`
			const foo = [1, 2, 3];
			const exists = includes(foo);
		`,
		outdent`
			const foo = [1, 2, 3];
			const exists = bar.includes(foo);
		`,
		outdent`
			const foo = [1, 2, 3];
			const exists = foo[includes](1);
		`,
		outdent`
			const foo = [1, 2, 3];
			const exists = foo.indexOf(1) !== -1;
		`,
		// Not only `foo.includes()`
		outdent`
			const foo = [1, 2, 3];
			const exists = foo.includes(1);
			foo.length = 1;
		`,
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				if (foo.includes(1)) {}
				return foo;
			}
		`,
		// Declared more than once
		outdent`
			var foo = [1, 2, 3];
			var foo = [4, 5, 6];
			const exists = foo.includes(1);
		`,

		outdent`
			const foo = bar;
			const exists = foo.includes(1);
		`,

		// Extra arguments
		outdent`
			const foo = [1, 2, 3];
			const exists = foo.includes();
		`,
		outdent`
			const foo = [1, 2, 3];
			const exists = foo.includes(1, 1);
		`,
		outdent`
			const foo = [1, 2, 3];
			const exists = foo.includes(1, 0);
		`,
		outdent`
			const foo = [1, 2, 3];
			const exists = foo.includes(1, undefined);
		`,
		outdent`
			const foo = [1, 2, 3];
			const exists = foo.includes(...[1]);
		`,
		// TODO: enable this test when eslint support optional-chaining
		// Optional
		// outdent`
		// 	const foo = [1, 2, 3];
		// 	const exists = foo.?includes(1);
		// `,
		// Different scope
		outdent`
			function unicorn() {
				const foo = [1, 2, 3];
			}
			const exists = foo.includes(1);
		`,

		// `export`
		outdent`
			export const foo = [1, 2, 3];
			const exists = foo.includes(1);
		`,
		outdent`
			module.exports = [1, 2, 3];
			const exists = module.exports.includes(1);
		`,
		outdent`
			const foo = [1, 2, 3];
			export {foo};
			const exists = foo.includes(1);
		`,
		outdent`
			const foo = [1, 2, 3];
			export default foo;
			const exists = foo.includes(1);
		`,
		outdent`
			const foo = [1, 2, 3];
			export {foo as bar};
			const exists = foo.includes(1);
		`,
		outdent`
			const foo = [1, 2, 3];
			module.exports = foo;
			const exists = foo.includes(1);
		`,
		outdent`
			const foo = [1, 2, 3];
			exports = foo;
			const exists = foo.includes(1);
		`,
		outdent`
			const foo = [1, 2, 3];
			module.exports.foo = foo;
			const exists = foo.includes(1);
		`,

		// `Array()`
		outdent`
			const foo = NotArray(1, 2);
			const exists = foo.includes(1);
		`,

		// `new Array()`
		outdent`
			const foo = new NotArray(1, 2);
			const exists = foo.includes(1);
		`,

		// `Array.from()` / `Array.of()`
		// Not `Array`
		outdent`
			const foo = NotArray.from({length: 1}, (_, index) => index);
			const exists = foo.includes(1);
		`,
		outdent`
			const foo = NotArray.of(1, 2);
			const exists = foo.includes(1);
		`,
		// Not `Listed`
		outdent`
			const foo = Array.notListed();
			const exists = foo.includes(1);
		`,
		// Computed
		outdent`
			const foo = Array[from]({length: 1}, (_, index) => index);
			const exists = foo.includes(1);
		`,
		outdent`
			const foo = Array[of](1, 2);
			const exists = foo.includes(1);
		`,
		// Not Identifier
		outdent`
			const foo = 'Array'.from({length: 1}, (_, index) => index);
			const exists = foo.includes(1);
		`,
		outdent`
			const foo = 'Array'.of(1, 2);
			const exists = foo.includes(1);
		`,
		outdent`
			const foo = Array['from']({length: 1}, (_, index) => index);
			const exists = foo.includes(1);
		`,
		outdent`
			const foo = Array['of'](1, 2);
			const exists = foo.includes(1);
		`,

		outdent`
			const foo = of(1, 2);
			const exists = foo.includes(1);
		`,
		outdent`
			const foo = from({length: 1}, (_, index) => index);
			const exists = foo.includes(1);
		`,

		// Methods
		// Not call
		...methodsReturnsArray.map(method => outdent`
			const foo = bar.${method};
			const exists = foo.includes(1);
		`),
		...methodsReturnsArray.map(method => outdent`
			const foo = new bar.${method}();
			const exists = foo.includes(1);
		`),
		// Not MemberExpression
		...methodsReturnsArray.map(method => outdent`
			const foo = ${method}();
			const exists = foo.includes(1);
		`),
		// Computed
		...methodsReturnsArray.map(method => outdent`
			const foo = bar[${method}]();
			const exists = foo.includes(1);
		`),
		// Not `Identifier`
		...methodsReturnsArray.map(method => outdent`
			const foo = bar["${method}"]();
			const exists = foo.includes(1);
		`),
		// Not listed method
		outdent`
			const foo = bar.notListed();
			const exists = foo.includes(1);
		`
	],
	invalid: [
		{
			code: outdent`
				const foo = [1, 2, 3];
				const exists = foo.includes(1);
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				const exists = foo.has(1);
			`,
			errors: createError('foo')
		},
		// SpreadElement
		{
			code: outdent`
				const foo = [...bar];
				const exists = foo.includes(1);
				bar.pop();
			`,
			output: outdent`
				const foo = new Set([...bar]);
				const exists = foo.has(1);
				bar.pop();
			`,
			errors: createError('foo')
		},
		// Multiple references
		{
			code: outdent`
				const foo = [1, 2, 3];
				const exists = foo.includes(1);
				function isExists(find) {
					return foo.includes(find);
				}
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				const exists = foo.has(1);
				function isExists(find) {
					return foo.has(find);
				}
			`,
			errors: createError('foo')
		},
		{
			code: outdent`
				function unicorn() {
					const foo = [1, 2, 3];
					return foo.includes(1);
				}
				const bar = [4, 5, 6];
				const exists = bar.includes(1);
			`,
			output: outdent`
				function unicorn() {
					const foo = new Set([1, 2, 3]);
					return foo.has(1);
				}
				const bar = new Set([4, 5, 6]);
				const exists = bar.has(1);
			`,
			errors: [
				...createError('foo'),
				...createError('bar')
			]
		},

		// `Array()`
		{
			code: outdent`
				const foo = Array(1, 2);
				const exists = foo.includes(1);
			`,
			output: outdent`
				const foo = new Set(Array(1, 2));
				const exists = foo.has(1);
			`,
			errors: createError('foo')
		},

		// `new Array()`
		{
			code: outdent`
				const foo = new Array(1, 2);
				const exists = foo.includes(1);
			`,
			output: outdent`
				const foo = new Set(new Array(1, 2));
				const exists = foo.has(1);
			`,
			errors: createError('foo')
		},

		// `Array.from()`
		{
			code: outdent`
				const foo = Array.from({length: 1}, (_, index) => index);
				const exists = foo.includes(1);
			`,
			output: outdent`
				const foo = new Set(Array.from({length: 1}, (_, index) => index));
				const exists = foo.has(1);
			`,
			errors: createError('foo')
		},

		// `Array.of()`
		{
			code: outdent`
				const foo = Array.of(1, 2);
				const exists = foo.includes(1);
			`,
			output: outdent`
				const foo = new Set(Array.of(1, 2));
				const exists = foo.has(1);
			`,
			errors: createError('foo')
		},

		// Methods
		...methodsReturnsArray.map(method => ({
			code: outdent`
				const foo = bar.${method}();
				const exists = foo.includes(1);
			`,
			output: outdent`
				const foo = new Set(bar.${method}());
				const exists = foo.has(1);
			`,
			errors: createError('foo')
		}))
	]
});
