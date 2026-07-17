import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const createError = name => ({
	messageId: 'error',
	data: {name},
});

const createTypeScriptFixCase = (typeAnnotation, setTypeAnnotation) => ({
	code: outdent`
		const a: ${typeAnnotation} = ['foo', 'bar']

		for (let i = 0; i < 3; i++) {
			if (a.includes(someString)) {
				console.log(123)
			}
		}
	`,
	output: outdent`
		const a: ${setTypeAnnotation} = new Set(['foo', 'bar'])

		for (let i = 0; i < 3; i++) {
			if (a.has(someString)) {
				console.log(123)
			}
		}
	`,
	errors: [createError('a')],
});

const createTypeScriptSuggestionCase = (typeAnnotation, typeDefinitions = '') => {
	const code = outdent`
		const a: ${typeAnnotation} = ['foo', 'bar']

		for (let i = 0; i < 3; i++) {
			if (a.includes(someString)) {
				console.log(123)
			}
		}
	`;

	const output = outdent`
		const a: ${typeAnnotation} = new Set(['foo', 'bar'])

		for (let i = 0; i < 3; i++) {
			if (a.has(someString)) {
				console.log(123)
			}
		}
	`;

	return {
		code: typeDefinitions ? `${typeDefinitions}\n${code}` : code,
		errors: [
			{
				...createError('a'),
				suggestions: [
					{
						messageId: 'suggestion',
						output: typeDefinitions ? `${typeDefinitions}\n${output}` : output,
					},
				],
			},
		],
	};
};

const methodsReturnsArray = [
	'copyWithin',
	'fill',
	'filter',
	'flat',
	'flatMap',
	'map',
	'reverse',
	'sort',
	'splice',
	'toReversed',
	'toSorted',
	'toSpliced',
	'with',
	'toArray',
	'split',
];

const methodsReturnsArrayOrString = [
	'concat',
	'slice',
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
		// Unsupported extra references
		outdent`
			const foo = [1, 2, 3];
			function unicorn() {
				foo.includes(1);
				foo.length = 1;
			}
		`,
		// Duplicates and `-0` can change the values produced by iteration/spread/forEach.
		outdent`
			const foo = [1, 1, 2];
			for (const element of foo) {
				console.log(element);
			}

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [NaN, NaN];
			for (const element of foo) {
				console.log(element);
			}

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [0, -0];
			for (const element of foo) {
				console.log(element);
			}

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 1, 2];
			const length = foo.length;

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		// Computed `length` access is not recognized as a length read, so the rule bails
		outdent`
			const foo = [1, 2, 3];
			foo['length'];

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 1, 2];
			call(...foo);

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 1, 2];
			foo.forEach(element => {
				console.log(element);
			});

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [-0];
			const values = [...foo];

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const value = -0;
			const foo = [value];
			const values = [...foo];

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		// Unknown uniqueness
		outdent`
			const value = 1;
			const foo = [value, value];
			for (const element of foo) {
				console.log(element);
			}

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const first = getValue();
			const second = getValue();
			const foo = [first, second];
			for (const element of foo) {
				console.log(element);
			}

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		// Unsupported initializer shapes
		outdent`
			const foo = [1, , 2];
			for (const element of foo) {
				console.log(element);
			}

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [...bar];
			for (const element of foo) {
				console.log(element);
			}

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = Array.of(1, 2, 3);
			for (const element of foo) {
				console.log(element);
			}

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		// Unsupported extra references
		outdent`
			const foo = [1, 2, 3];
			console.log(foo[0]);

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		{
			code: outdent`
				function f(a, b, c) {
					const foo = [a];
					return c.map(i => b.includes(foo[i]));
				}
			`,
		},
		outdent`
			const foo = [1, 2, 3];
			function unicorn(index) {
				return bar.includes(foo[index]) || bar.includes(foo[index + 1]);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			function unicorn(value) {
				return foo[value].includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			const object = {...foo};

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			foo.forEach((element, index) => {
				console.log(element, index);
			});

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			foo.forEach((...elements) => {
				console.log(elements[1]);
			});

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			foo.forEach(function (element) {
				console.log(arguments[1]);
			});

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			foo.forEach(callback);

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		// `.length` writes
		outdent`
			const foo = [1, 2, 3];
			delete foo.length;

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			foo.length++;

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			const object = {};

			for (foo.length in object) {}

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			const values = [];

			for (foo.length of values) {}

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			const object = {};

			({length: foo.length} = object);

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			const object = {};

			({length: foo.length = 0} = object);

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			const object = {};

			({...foo.length} = object);

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			const values = [];

			[...foo.length] = values;

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		// One-off lookup with supported extra references
		outdent`
			const foo = [1, 2, 3];
			const values = [...foo];
			const exists = foo.includes(1);
		`,
		outdent`
			const foo = [1, 2, 3];
			const length = foo.length;
			const exists = foo.includes(1);
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
		...methodsReturnsArray
			.filter(method => method !== 'with')
			.map(method => outdent`
				const foo = ${method}();
				function unicorn() {
					return foo.includes(1);
				}
			`),
		// Computed
		...methodsReturnsArray
			.filter(method => method !== 'with')
			.map(method => outdent`
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
		...methodsReturnsArrayOrString.map(method => outdent`
			const foo = bar.${method}();
			function unicorn() {
				return foo.includes(1);
			}
		`),

		// `lodash`
		outdent`
			const foo = _.map([1, 2, 3], value => value);
			function unicorn() {
				return _.includes(foo, 1);
			}
		`,
		outdent`
			const text = 'abc'.slice();
			text.includes('ab') || text.includes('bc');
		`,
		outdent`
			const text = \`abc\`.concat('def');
			text.includes('ab') || text.includes('bc');
		`,
		outdent`
			const text = \`${1}abc\`.slice();
			text.includes('ab') || text.includes('bc');
		`,
		outdent`
			let items = [1, 2, 3];
			items = 'abc';
			const foo = items.slice();
			foo.includes('ab') || foo.includes('bc');
		`,
		// `Iterator.concat()`
		outdent`
			const foo = Iterator.concat(bar);
			foo.includes(1) || foo.includes(2);
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
		outdent`
			const foo = [1, 2, 3];
			for (const element of foo) {
				console.log(element);
			}

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			const bar = [...foo];

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			call(...foo);

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			new Call(...foo);

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			const length = foo.length;

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			foo.forEach(element => {
				console.log(element);
			});

			function unicorn(value) {
				return foo.includes(value);
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
			`),
		outdent`
			const foo = [1, 2, 3].slice();
			foo.includes(1) || foo.includes(2);
		`,
		outdent`
			const foo = [1, 2, 3].concat(4);
			foo.includes(1) || foo.includes(2);
		`,
		outdent`
			const items = [1, 2, 3];
			const foo = items.slice();
			foo.includes(1) || foo.includes(2);
		`,
		outdent`
			const items = [1, 2, 3];
			const foo = items.concat(4);
			foo.includes(1) || foo.includes(2);
		`,
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
	valid: [
		{
			code: outdent`
				const foo = [1, 2, 3, 4];
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array.of(1, 2, 3, 4);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array.from({length: 4}, (_, index) => index);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array.from([1, 2, 3, 4]);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array.from([1, 2, 3, 4, ...bar]);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array.from(...bar);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array.from('test');
				function unicorn() {
					return foo.includes('t');
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array(4);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array(...bar);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array(1, 2, 3, 4);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = new Array(4);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = new Array(...bar);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array(2 ** 32);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = bar.map(value => value);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array.of(...bar);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = [1, 2, 3, 4, ...bar];
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array.from({
					length: 5,
					*[Symbol.iterator]() {
						yield 1;
					},
				});
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array.from({length: 2 ** 32}, (_, index) => index);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
	],
	invalid: [
		{
			code: outdent`
				const foo = [1, 2, 3, 4, 5];
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array.of(1, 2, 3, 4, 5);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array.from({length: 5}, (_, index) => index);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array.from({length: 2 + 3}, (_, index) => index);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array.from([1, 2, 3, 4, 5]);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array.from('hello');
				function unicorn() {
					return foo.includes('h');
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array(5);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array(2 + 3);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = Array(1, 2, 3, 4, 5);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = new Array(5);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
		{
			code: outdent`
				const foo = new Array(1, 2, 3, 4, 5);
				function unicorn() {
					return foo.includes(1);
				}
			`,
			options: [{minimumItems: 5}],
		},
	],
});

test({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
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

					return {
						availableComponents,
					}
				},
			)
			export default class A {}
		`,
		outdent`
			const foo = [1, 2, 3];
			(foo.length as number) = 1;

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			(foo.length!) = 1;

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
		outdent`
			const foo = [1, 2, 3];
			(<number>foo.length) = 1;

			function unicorn(value) {
				return foo.includes(value);
			}
		`,
	],
	invalid: [
		createTypeScriptFixCase('Array<\'foo\' | \'bar\'>', 'Set<\'foo\' | \'bar\'>'),
		createTypeScriptFixCase('string[]', 'Set<string>'),
		createTypeScriptFixCase('(string | number)[]', 'Set<string | number>'),
		createTypeScriptFixCase('ReadonlyArray<string>', 'ReadonlySet<string>'),
		createTypeScriptFixCase('readonly string[]', 'ReadonlySet<string>'),
		createTypeScriptFixCase('readonly (string | number)[]', 'ReadonlySet<string | number>'),
		createTypeScriptSuggestionCase('Items', 'type Items = string[]'),
		createTypeScriptSuggestionCase('[string, string]'),
		createTypeScriptSuggestionCase('string /* comment */ []'),
		{
			code: outdent`
				const foo: string[] = ['a', 'b']
				const length = foo.length

				function has(value) {
					return foo.includes(value)
				}
			`,
			output: outdent`
				const foo: Set<string> = new Set(['a', 'b'])
				const length = foo.size

				function has(value) {
					return foo.has(value)
				}
			`,
			errors: [createError('foo')],
		},
	],
});
