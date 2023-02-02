import outdent from 'outdent';
import {getTester, parsers} from './utils/test.mjs';

const {test} = getTester(import.meta);

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
];

test.snapshot({
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
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				return foo.includes(1);
			}
		`,

		// Called multiple times
		outdent`
			const foo = [1, 2, 3];
			const isExists = foo.includes(1);
			const isExists2 = foo.includes(2);
		`,

		// `ForOfStatement`
		outdent`
			const foo = [1, 2, 3];
			for (const a of b) {
				foo.includes(1);
			}
		`,
		outdent`
			async function unicorn() {
				const foo = [1, 2, 3];
				for await (const a of b) {
					foo.includes(1);
				}
			}
		`,

		// `ForStatement`
		outdent`
			const foo = [1, 2, 3];
			for (let i = 0; i < n; i++) {
				foo.includes(1);
			}
		`,

		// `ForInStatement`
		outdent`
			const foo = [1, 2, 3];
			for (let a in b) {
				foo.includes(1);
			}
		`,

		// `WhileStatement`
		outdent`
			const foo = [1, 2, 3];
			while (a)  {
				foo.includes(1);
			}
		`,

		// `DoWhileStatement`
		outdent`
			const foo = [1, 2, 3];
			do {
				foo.includes(1);
			} while (a)
		`,
		outdent`
			const foo = [1, 2, 3];
			do {
				// …
			} while (foo.includes(1))
		`,

		// `function` https://github.com/estools/esquery/blob/master/esquery.js#L216
		// `FunctionDeclaration`
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				return foo.includes(1);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			function * unicorn() {
				return foo.includes(1);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			async function unicorn() {
				return foo.includes(1);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			async function * unicorn() {
				return foo.includes(1);
			}
		`,
		// `FunctionExpression`
		outdent`
			const foo = [1, 2, 3];
			const unicorn = function () {
				return foo.includes(1);
			}
		`,
		// `ArrowFunctionExpression`
		outdent`
			const foo = [1, 2, 3];
			const unicorn = () => foo.includes(1);
		`,

		outdent`
			const foo = [1, 2, 3];
			const a = {
				b() {
					return foo.includes(1);
				}
			};
		`,

		outdent`
			const foo = [1, 2, 3];
			class A {
				b() {
					return foo.includes(1);
				}
			}
		`,

		// SpreadElement
		outdent`
			const foo = [...bar];
			function unicorn() {
				return foo.includes(1);
			}
			bar.pop();
		`,
		// Multiple references
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				const exists = foo.includes(1);
				function isExists(find) {
					return foo.includes(find);
				}
			}
		`,
		outdent`
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
		// Different scope
		outdent`
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

		// `Array()`
		outdent`
			const foo = Array(1, 2);
			function unicorn() {
				return foo.includes(1);
			}
		`,

		// `new Array()`
		outdent`
			const foo = new Array(1, 2);
			function unicorn() {
				return foo.includes(1);
			}
		`,

		// `Array.from()`
		outdent`
			const foo = Array.from({length: 1}, (_, index) => index);
			function unicorn() {
				return foo.includes(1);
			}
		`,

		// `Array.of()`
		outdent`
			const foo = Array.of(1, 2);
			function unicorn() {
				return foo.includes(1);
			}
		`,

		// Methods
		...methodsReturnsArray.map(method =>
			outdent`
				const foo = bar.${method}();
				function unicorn() {
					return foo.includes(1);
				}
			`,
		),

		// `lodash`
		// `bar` is not `array`, but code not broken
		// See https://github.com/sindresorhus/eslint-plugin-unicorn/pull/641
		outdent`
			const foo = _([1,2,3]);
			const bar = foo.map(value => value);
			function unicorn() {
				return bar.includes(1);
			}
		`,
	],
});

test.snapshot({
	testerOptions: {
		parser: parsers.babel,
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

test.snapshot({
	testerOptions: {
		parser: parsers.typescript,
	},
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
		outdent`
			const a: Array<'foo' | 'bar'> = ['foo', 'bar']

			for (let i = 0; i < 3; i++) {
				if (a.includes(someString)) {
					console.log(123)
				}
			}
		`,
	],
});
