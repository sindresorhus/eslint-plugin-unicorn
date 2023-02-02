import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const createError = name => [
	{
		messageId: 'error',
		data: {
			name,
		},
	},
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
	'splice',
	'toReversed',
	'toSorted',
	'toSpliced',
	'with',
];

test({
	valid: [
		outdent`
			const foo = new Set([1, 2, 3]);
			function unicorn() {
				return foo.has(1);
			}
		`,
		// Only called once
		outdent`
			const foo = [1, 2, 3];
			const isExists = foo.includes(1);
		`,
		outdent`
			while (a) {
				const foo = [1, 2, 3];
				const isExists = foo.includes(1);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			(() => {})(foo.includes(1));
		`,

		// Not `VariableDeclarator`
		outdent`
			foo = [1, 2, 3];
			function unicorn() {
				return foo.includes(1);
			}
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
			function unicorn() {
				return foo.includes;
			}
		`,
		// Not `foo.includes()`
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				return includes(foo);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				return bar.includes(foo);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				return foo[includes](1);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				return foo.indexOf(1) !== -1;
			}
		`,
		// Not only `foo.includes()`
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				foo.includes(1);
				foo.length = 1;
			}
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
			function unicorn() {
				return foo.includes(1);
			}
		`,

		outdent`
			const foo = bar;
			function unicorn() {
				return foo.includes(1);
			}
		`,

		// Extra arguments
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				return foo.includes();
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				return foo.includes(1, 1);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				return foo.includes(1, 0);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				return foo.includes(1, undefined);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				return foo.includes(...[1]);
			}
		`,
		// Optional
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				return foo?.includes(1);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				return foo.includes?.(1);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				return foo?.includes?.(1);
			}
		`,
		// Different scope
		outdent`
			function unicorn() {
				const foo = [1, 2, 3];
			}
			function unicorn2() {
				return foo.includes(1);
			}
		`,

		// `export`
		outdent`
			export const foo = [1, 2, 3];
			function unicorn() {
				return foo.includes(1);
			}
		`,
		outdent`
			module.exports = [1, 2, 3];
			function unicorn() {
				return module.exports.includes(1);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			export {foo};
			function unicorn() {
				return foo.includes(1);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			export default foo;
			function unicorn() {
				return foo.includes(1);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			export {foo as bar};
			function unicorn() {
				return foo.includes(1);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			module.exports = foo;
			function unicorn() {
				return foo.includes(1);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			exports = foo;
			function unicorn() {
				return foo.includes(1);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			module.exports.foo = foo;
			function unicorn() {
				return foo.includes(1);
			}
		`,

		// `Array()`
		outdent`
			const foo = NotArray(1, 2);
			function unicorn() {
				return foo.includes(1);
			}
		`,

		// `new Array()`
		outdent`
			const foo = new NotArray(1, 2);
			function unicorn() {
				return foo.includes(1);
			}
		`,

		// `Array.from()` / `Array.of()`
		// Not `Array`
		outdent`
			const foo = NotArray.from({length: 1}, (_, index) => index);
			function unicorn() {
				return foo.includes(1);
			}
		`,
		outdent`
			const foo = NotArray.of(1, 2);
			function unicorn() {
				return foo.includes(1);
			}
		`,
		// Not `Listed`
		outdent`
			const foo = Array.notListed();
			function unicorn() {
				return foo.includes(1);
			}
		`,
		// Computed
		outdent`
			const foo = Array[from]({length: 1}, (_, index) => index);
			function unicorn() {
				return foo.includes(1);
			}
		`,
		outdent`
			const foo = Array[of](1, 2);
			function unicorn() {
				return foo.includes(1);
			}
		`,
		// Not Identifier
		outdent`
			const foo = 'Array'.from({length: 1}, (_, index) => index);
			function unicorn() {
				return foo.includes(1);
			}
		`,
		outdent`
			const foo = 'Array'.of(1, 2);
			function unicorn() {
				return foo.includes(1);
			}
		`,
		outdent`
			const foo = Array['from']({length: 1}, (_, index) => index);
			function unicorn() {
				return foo.includes(1);
			}
		`,
		outdent`
			const foo = Array['of'](1, 2);
			function unicorn() {
				return foo.includes(1);
			}
		`,

		outdent`
			const foo = of(1, 2);
			function unicorn() {
				return foo.includes(1);
			}
		`,
		outdent`
			const foo = from({length: 1}, (_, index) => index);
			function unicorn() {
				return foo.includes(1);
			}
		`,

		// Methods
		// Not call
		...methodsReturnsArray.map(method => outdent`
			const foo = bar.${method};
			function unicorn() {
				return foo.includes(1);
			}
		`),
		...methodsReturnsArray.map(method => outdent`
			const foo = new bar.${method}();
			function unicorn() {
				return foo.includes(1);
			}
		`),
		// Not MemberExpression
		...methodsReturnsArray.map(method => outdent`
			const foo = ${method}();
			function unicorn() {
				return foo.includes(1);
			}
		`),
		// Computed
		...methodsReturnsArray.map(method => outdent`
			const foo = bar[${method}]();
			function unicorn() {
				return foo.includes(1);
			}
		`),
		// Not `Identifier`
		...methodsReturnsArray.map(method => outdent`
			const foo = bar["${method}"]();
			function unicorn() {
				return foo.includes(1);
			}
		`),
		// Not listed method
		outdent`
			const foo = bar.notListed();
			function unicorn() {
				return foo.includes(1);
			}
		`,

		// `lodash`
		outdent`
			const foo = _.map([1, 2, 3], value => value);
			function unicorn() {
				return _.includes(foo, 1);
			}
		`,
	],
	invalid: [
		{
			code: outdent`
				const foo = [1, 2, 3];
				function unicorn() {
					return foo.includes(1);
				}
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				function unicorn() {
					return foo.has(1);
				}
			`,
			errors: createError('foo'),
		},

		// Called multiple times
		{
			code: outdent`
				const foo = [1, 2, 3];
				const isExists = foo.includes(1);
				const isExists2 = foo.includes(2);
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				const isExists = foo.has(1);
				const isExists2 = foo.has(2);
			`,
			errors: createError('foo'),
		},

		// `ForOfStatement`
		{
			code: outdent`
				const foo = [1, 2, 3];
				for (const a of b) {
					foo.includes(1);
				}
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				for (const a of b) {
					foo.has(1);
				}
			`,
			errors: createError('foo'),
		},
		{
			code: outdent`
				async function unicorn() {
					const foo = [1, 2, 3];
					for await (const a of b) {
						foo.includes(1);
					}
				}
			`,
			output: outdent`
				async function unicorn() {
					const foo = new Set([1, 2, 3]);
					for await (const a of b) {
						foo.has(1);
					}
				}
			`,
			errors: createError('foo'),
		},

		// `ForStatement`
		{
			code: outdent`
				const foo = [1, 2, 3];
				for (let i = 0; i < n; i++) {
					foo.includes(1);
				}
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				for (let i = 0; i < n; i++) {
					foo.has(1);
				}
			`,
			errors: createError('foo'),
		},

		// `ForInStatement`
		{
			code: outdent`
				const foo = [1, 2, 3];
				for (let a in b) {
					foo.includes(1);
				}
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				for (let a in b) {
					foo.has(1);
				}
			`,
			errors: createError('foo'),
		},

		// `WhileStatement`
		{
			code: outdent`
				const foo = [1, 2, 3];
				while (a)  {
					foo.includes(1);
				}
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				while (a)  {
					foo.has(1);
				}
			`,
			errors: createError('foo'),
		},

		// `DoWhileStatement`
		{
			code: outdent`
				const foo = [1, 2, 3];
				do {
					foo.includes(1);
				} while (a)
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				do {
					foo.has(1);
				} while (a)
			`,
			errors: createError('foo'),
		},
		{
			code: outdent`
				const foo = [1, 2, 3];
				do {
					// …
				} while (foo.includes(1))
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				do {
					// …
				} while (foo.has(1))
			`,
			errors: createError('foo'),
		},

		// `function` https://github.com/estools/esquery/blob/master/esquery.js#L216
		// `FunctionDeclaration`
		{
			code: outdent`
				const foo = [1, 2, 3];
				function unicorn() {
					return foo.includes(1);
				}
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				function unicorn() {
					return foo.has(1);
				}
			`,
			errors: createError('foo'),
		},
		{
			code: outdent`
				const foo = [1, 2, 3];
				function * unicorn() {
					return foo.includes(1);
				}
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				function * unicorn() {
					return foo.has(1);
				}
			`,
			errors: createError('foo'),
		},
		{
			code: outdent`
				const foo = [1, 2, 3];
				async function unicorn() {
					return foo.includes(1);
				}
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				async function unicorn() {
					return foo.has(1);
				}
			`,
			errors: createError('foo'),
		},
		{
			code: outdent`
				const foo = [1, 2, 3];
				async function * unicorn() {
					return foo.includes(1);
				}
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				async function * unicorn() {
					return foo.has(1);
				}
			`,
			errors: createError('foo'),
		},
		// `FunctionExpression`
		{
			code: outdent`
				const foo = [1, 2, 3];
				const unicorn = function () {
					return foo.includes(1);
				}
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				const unicorn = function () {
					return foo.has(1);
				}
			`,
			errors: createError('foo'),
		},
		// `ArrowFunctionExpression`
		{
			code: outdent`
				const foo = [1, 2, 3];
				const unicorn = () => foo.includes(1);
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				const unicorn = () => foo.has(1);
			`,
			errors: createError('foo'),
		},

		{
			code: outdent`
				const foo = [1, 2, 3];
				const a = {
					b() {
						return foo.includes(1);
					}
				};
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				const a = {
					b() {
						return foo.has(1);
					}
				};
			`,
			errors: createError('foo'),
		},

		{
			code: outdent`
				const foo = [1, 2, 3];
				class A {
					b() {
						return foo.includes(1);
					}
				}
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				class A {
					b() {
						return foo.has(1);
					}
				}
			`,
			errors: createError('foo'),
		},

		// SpreadElement
		{
			code: outdent`
				const foo = [...bar];
				function unicorn() {
					return foo.includes(1);
				}
				bar.pop();
			`,
			output: outdent`
				const foo = new Set([...bar]);
				function unicorn() {
					return foo.has(1);
				}
				bar.pop();
			`,
			errors: createError('foo'),
		},
		// Multiple references
		{
			code: outdent`
				const foo = [1, 2, 3];
				function unicorn() {
					const exists = foo.includes(1);
					function isExists(find) {
						return foo.includes(find);
					}
				}
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				function unicorn() {
					const exists = foo.has(1);
					function isExists(find) {
						return foo.has(find);
					}
				}
			`,
			errors: createError('foo'),
		},
		{
			code: outdent`
				function wrap() {
					const foo = [1, 2, 3];

					function unicorn() {
						return foo.includes(1);
					}
				}

				const bar = [4, 5, 6];

				function unicorn() {
					return bar.includes(1);
				}
			`,
			output: outdent`
				function wrap() {
					const foo = new Set([1, 2, 3]);

					function unicorn() {
						return foo.has(1);
					}
				}

				const bar = new Set([4, 5, 6]);

				function unicorn() {
					return bar.has(1);
				}
			`,
			errors: [
				...createError('foo'),
				...createError('bar'),
			],
		},
		// Different scope
		{
			code: outdent`
				const foo = [1, 2, 3];
				function wrap() {
					const exists = foo.includes(1);
					const bar = [1, 2, 3];

					function outer(find) {
						const foo = [1, 2, 3];
						while (a) {
							foo.includes(1);
						}

						function inner(find) {
							const bar = [1, 2, 3];
							while (a) {
								const exists = bar.includes(1);
							}
						}
					}
				}
			`,
			output: outdent`
				const foo = new Set([1, 2, 3]);
				function wrap() {
					const exists = foo.has(1);
					const bar = [1, 2, 3];

					function outer(find) {
						const foo = new Set([1, 2, 3]);
						while (a) {
							foo.has(1);
						}

						function inner(find) {
							const bar = new Set([1, 2, 3]);
							while (a) {
								const exists = bar.has(1);
							}
						}
					}
				}
			`,
			errors: [
				...createError('foo'),
				...createError('foo'),
				...createError('bar'),
			],
		},

		// `Array()`
		{
			code: outdent`
				const foo = Array(1, 2);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			output: outdent`
				const foo = new Set(Array(1, 2));
				function unicorn() {
					return foo.has(1);
				}
			`,
			errors: createError('foo'),
		},

		// `new Array()`
		{
			code: outdent`
				const foo = new Array(1, 2);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			output: outdent`
				const foo = new Set(new Array(1, 2));
				function unicorn() {
					return foo.has(1);
				}
			`,
			errors: createError('foo'),
		},

		// `Array.from()`
		{
			code: outdent`
				const foo = Array.from({length: 1}, (_, index) => index);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			output: outdent`
				const foo = new Set(Array.from({length: 1}, (_, index) => index));
				function unicorn() {
					return foo.has(1);
				}
			`,
			errors: createError('foo'),
		},

		// `Array.of()`
		{
			code: outdent`
				const foo = Array.of(1, 2);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			output: outdent`
				const foo = new Set(Array.of(1, 2));
				function unicorn() {
					return foo.has(1);
				}
			`,
			errors: createError('foo'),
		},

		// Methods
		...methodsReturnsArray.map(method => ({
			code: outdent`
				const foo = bar.${method}();
				function unicorn() {
					return foo.includes(1);
				}
			`,
			output: outdent`
				const foo = new Set(bar.${method}());
				function unicorn() {
					return foo.has(1);
				}
			`,
			errors: createError('foo'),
		})),

		// `lodash`
		// `bar` is not `array`, but code not broken
		// See https://github.com/sindresorhus/eslint-plugin-unicorn/pull/641
		{
			code: outdent`
				const foo = _([1,2,3]);
				const bar = foo.map(value => value);
				function unicorn() {
					return bar.includes(1);
				}
			`,
			output: outdent`
				const foo = _([1,2,3]);
				const bar = new Set(foo.map(value => value));
				function unicorn() {
					return bar.has(1);
				}
			`,
			errors: createError('bar'),
		},
	],
});

test.babel({
	testerOptions: {
		parserOptions: {
			babelOptions: {
				parserOpts: {
					plugins: [
						['decorators', {decoratorsBeforeExport: true}],
					],
				},
			},
		},
	},
	valid: [
		// https://github.com/TheThingsNetwork/lorawan-stack/blob/1dab30227e632ceade425e0c67d5f84316e830da/pkg/webui/console/containers/device-importer/index.js#L74
		outdent`
			@connect(
				state => {
					const availableComponents = ['is']
					if (nsConfig.enabled) availableComponents.push('ns')
					if (jsConfig.enabled) availableComponents.push('js')
					if (asConfig.enabled) availableComponents.push('as')

					return {
						availableComponents,
					}
				},
			)
			export default class A {}
		`,
	],
	invalid: [
	],
});

test.typescript({
	valid: [
		// https://github.com/TheThingsNetwork/lorawan-stack/blob/1dab30227e632ceade425e0c67d5f84316e830da/pkg/webui/console/containers/device-importer/index.js#L74
		outdent`
			@connect(
				state => {
					const availableComponents = ['is']
					if (nsConfig.enabled) availableComponents.push('ns')
					if (jsConfig.enabled) availableComponents.push('js')

					return {
						availableComponents,
					}
				},
			)
			export default class A {}
		`,
	],
	invalid: [
		{
			code: outdent`
				const a: Array<'foo' | 'bar'> = ['foo', 'bar']

				for (let i = 0; i < 3; i++) {
					if (a.includes(someString)) {
						console.log(123)
					}
				}
			`,
			errors: [
				{
					message: '`a` should be a `Set`, and use `a.has()` to check existence or non-existence.',
					suggestions: [
						{
							desc: 'Switch `a` to `Set`.',
							output: outdent`
								const a: Array<'foo' | 'bar'> = new Set(['foo', 'bar'])

								for (let i = 0; i < 3; i++) {
									if (a.has(someString)) {
										console.log(123)
									}
								}
							`,
						},
					],
				},
			],
		},
	],
});
