import {fileURLToPath} from 'node:url';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, avoidTestTitleConflict} from './utils/test.js';

const {test} = getTester(import.meta);
const fixtureDirectory = fileURLToPath(new URL('fixtures/no-for-loop/', import.meta.url));

function testCase(code, output) {
	return output ? {code, output, errors: 1} : {code, errors: 1};
}

const typeAnnotatedIndexUsage = (type, parameterName = 'items') => [
	`function foo(${parameterName}: ${type}) {`,
	`\tfor (let i = 0; i < ${parameterName}.length; i++) {`,
	`\t\tconsole.log(i, ${parameterName}[i]);`,
	'\t}',
	'}',
].join('\n');

const typeAware = (code, output) => ({
	...testCase(code, output),
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {
			tsconfigRootDir: fixtureDirectory,
			projectService: {
				allowDefaultProject: ['*.ts'],
				defaultProject: 'tsconfig.json',
			},
		},
	},
});

test({
	valid: [
		outdent`
			const value = Number(1);
			for (let index = 0; index < value.length; index++) {
				console.log(value[index]);
			}
		`,
		outdent`
			const value = '123'.indexOf('1');
			for (let index = 0; index < value.length; index++) {
				console.log(value[index]);
			}
		`,
		outdent`
			const value = '123'.includes('1');
			for (let index = 0; index < value.length; index++) {
				console.log(value[index]);
			}
		`,
		'for (;;);',
		'for (;;) {}',
		'for (a;; c) { d }',
		'for (a; b;) { d }',
		'for (the; love; of) { god }',
		'for ([a] = b; f(c); d--) { arr[d] }',
		'for (var a = b; c < arr.length; d++) { arr[e] }',
		'for (const x of xs) {}',

		'for (var j = 0; j < 10; j++) {}',
		outdent`
			for (i = 0; i < arr.length; i++) {
				el = arr[i];
				console.log(i, el);
			}
		`,
		outdent`
			var foo = function () {
				for (var i = 0; i < bar.length; i++) {
				}
			};
		`,

		// Screwing with initialization expression

		outdent`
			for (let i = 0, j = 0; i < arr.length; i++) {
				const el = arr[i];
				console.log(i, el);
			}
		`,
		outdent`
			for (let i = 0, j = other.length; i < arr.length; i++) {
				const el = arr[i];
				console.log(i, el);
			}
		`,
		outdent`
			for (let i = 0, j = arr.length, k = 0; i < j; i++) {
				const el = arr[i];
				console.log(i, el);
			}
		`,
		outdent`
			for (let j = arr.length, i = 0; i < j; i++) {
				const el = arr[i];
				console.log(i, el);
			}
		`,
		outdent`
			for (let {i} = 0; i < arr.length; i++) {
				const el = arr[i];
				console.log(i, el);
			}
		`,

		// Screwing with test expression

		outdent`
			for (let i = 0; f(i, arr.length); i++) {
				const el = arr[i];
				console.log(i, el);
			}
		`,
		outdent`
			for (let i = 0; i < arr.size; i++) {
				const el = arr[i];
				console.log(i, el);
			}
		`,
		outdent`
			for (let i = 0; j < arr.length; i++) {
				const el = arr[i];
				console.log(i, el);
			}
		`,
		outdent`
			for (let i = 0; i <= arr.length; i++) {
				const el = arr[i];
				console.log(i, el);
			}
		`,
		outdent`
			for (let i = 0; i < arr['length']; i++) {
				const el = arr[i];
				console.log(i, el);
			}
		`,
		outdent`
			for (let i = 0, j = arr['length']; i < j; i++) {
				const el = arr[i];
				console.log(i, el);
			}
		`,
		outdent`
			for (let i = 0, j = arr.length; i < j; (i++, foo(j))) {
				console.log(arr[i]);
			}
		`,
		outdent`
			for (let i = 0, j = arr.length; i < j; (i++, j--)) {
				console.log(arr[i]);
			}
		`,
		outdent`
			for (let i = 0, j = arr.length; i < j; (i++, foo(), j)) {
				console.log(arr[i]);
			}
		`,
		outdent`
			for (let i = 0, j = arr.length; i < j; (i++, j, i++)) {
				console.log(arr[i]);
			}
		`,
		outdent`
			for (let i = 0, j = arr.length; i < j; i++) {
				function get(i) {
					return arr[i];
				}
			}
		`,
		outdent`
			for (let i = 0, j = arr.length; i < j; i++) {
				function get(arr) {
					return arr[i];
				}
			}
		`,
		outdent`
			for (let i = 0, j = arr.length; i < j; i++) {
				console.log(arr[i]);
				j--;
			}
		`,
		outdent`
			for (let i = 0, j = arr.length; i < j; i++) {
				arr[i]++;
			}
		`,
		outdent`
			for (let i = 0, j = arr.length; i < j; i++) {
				delete arr[i];
			}
		`,

		// Screwing with update expression

		outdent`
			for (let i = 0; arr.length > i;) {
				let el = arr[i];
				console.log(i, el);
			}
		`,
		outdent`
			for (let i = 0; arr.length > i; i--) {
				let el = arr[i];
				console.log(i, el);
			}
		`,
		outdent`
			for (let i = 0; arr.length > i; f(i)) {
				let el = arr[i];
				console.log(i, el);
			}
		`,
		outdent`
			for (let i = 0; arr.length > i; i = f(i)) {
				let el = arr[i];
				console.log(i, el);
			}
		`,

		// Screwing with the body

		'for (let i = 0; arr.length > i; i ++);',
		'for (let i = 0; arr.length > i; i ++) console.log(NaN)',

		// Screwing with element variable declaration

		outdent`
			for (let i = 0; i < arr.length; ++i) {
				const el = f(i);
				console.log(i, el);
			}
		`,
		outdent`
			for (var j = 0; j < xs.length; j++) {
				var x;
			}
		`,
		outdent`
			for (var j = 0; j < xs.length; j++) {
				var {x} = y;
			}
		`,
		outdent`
			for (let i = 0; i < arr.length; i++) {
				console.log(i);
			}
		`,

		// Index is assigned to inside the loop body
		outdent`
			for (let i = 0; i < input.length; i++) {
				const el = input[i];
				i++;
				console.log(i, el);
			}
		`,

		outdent`
			for (let i = 0; i < input.length; i++) {
				const el = input[i];
				i = 4;
				console.log(i, el);
			}
		`,

		// Using the array other than reading the index
		outdent`
			for (let i = 0; i < arr.length;i++) {
				console.log(arr[i]);
				arr.reverse();
			}
		`,

		// Modifying the array element
		outdent`
			for (let i = 0; i < arr.length; i++) {
				arr[i] = i + 2;
			}
		`,

		// Child scope
		outdent`
			for (let i = 0; i < cities.length; i++) {
				const foo = function () {
					console.log(cities)
				}
			}
		`,

		// With variable containing static, non-array value.
		'const notArray = "abc"; for (let i = 0; i < notArray.length; i++) { console.log(notArray[i]); }',
		outdent`
			const text = '123'.slice(1);
			for (let i = 0; i < text.length; i++) {
				console.log(text[i]);
			}
		`,
		'const notArray = 123; for (let i = 0; i < notArray.length; i++) { console.log(notArray[i]); }',
		'const notArray = true; for (let i = 0; i < notArray.length; i++) { console.log(notArray[i]); }',
		outdent`
			const object = {value: []};
			Object.defineProperty(object, 'value', {get() { return new Set(); }});
			for (let i = 0; i < object.value.length; i++) {
				console.log(object.value[i]);
			}
		`,
	],

	invalid: [
		{
			code: outdent`
				const array = [1].slice();
				for (let i = 0; i < array.length; i++) {
					console.log(array[i]);
				}
			`,
			output: outdent`
				const array = [1].slice();
				for (const element of array) {
					console.log(element);
				}
			`,
			errors: 1,
		},
		// Cached-length pattern
		testCase(outdent`
			for (let i = 0, j = arr.length; i < j; i += 1) {
				console.log(arr[i])
			}
		`, outdent`
			for (const element of arr) {
				console.log(element)
			}
		`),

		testCase(outdent`
			for (let i = 0, /* cached length */ j = arr.length; i < j; i++) {
				console.log(arr[i]);
			}
		`),

		testCase(outdent`
			for (let i = 0, j = arr.length; i < j; i++) {
				const el = arr[i];
				console.log(i, el);
			}
		`, outdent`
			for (const [i, el] of arr.entries()) {
				console.log(i, el);
			}
		`),

		testCase(outdent`
			for (let i = 0, j = arr.length; j > i; i += 1) {
				let el = arr[i];
				console.log(i, el);
			}
		`, outdent`
			for (let [i, el] of arr.entries()) {
				console.log(i, el);
			}
		`),

		testCase(outdent`
			for (var i = 0, j = arr.length; i < j; i++) {
				console.log(arr[i]);
			}
		`, outdent`
			for (const element of arr) {
				console.log(element);
			}
		`),

		testCase(outdent`
			for (let i = 0, j = arr.length; i < j; i++) {
				console.log(arr[i], j);
			}
		`),

		testCase(outdent`
			for (let i = 0, j = arr.length; i < j; i++) {
				queueMicrotask(() => {
					console.log(j);
				});
				console.log(arr[i]);
			}
		`),

		testCase(outdent`
			for (let i = 0, j = arr.length; i < j; (i++, j)) {
				console.log(arr[i]);
			}
		`),

		testCase(outdent`
			for (let i = 0, j = arr.length; i < j; (j, i++)) {
				console.log(arr[i]);
			}
		`),

		testCase(outdent`
			for (var i = 0, j = arr.length; i < j; i++) {
				console.log(arr[i]);
			}
			console.log(j);
		`),

		testCase(outdent`
			for (var i = 0, j = arr.length; i < j; i++) {
				let j = 1;
				console.log(arr[i]);
			}
			console.log(j);
		`),

		testCase(outdent`
			for (var i = 0, j = arr.length; i < j; i++) {
				console.log(arr[i]);
			}
			j = 1;
		`),

		testCase(outdent`
			for (var i = 0, length = arr.length; i < length; i++) {
				console.log(arr[i]);
			}
			console.log(i);
		`),

		testCase(outdent`
			for (let i = 0, length = arr.length; i < length; i++) {
				console.log(arr[i]);
				arr[i].doSomething();
				const element = arr[i];
				const next = i + 1;
			}
		`, outdent`
			for (const [i, element] of arr.entries()) {
				console.log(element);
				element.doSomething();
				const next = i + 1;
			}
		`),

		testCase(outdent`
			for (let i = 0, length = items.length; i < length; i++) {
				const {id} = items[i];
				console.log(id);
			}
		`, outdent`
			for (const {id} of items) {
				console.log(id);
			}
		`),

		// Use default name
		testCase(outdent`
			for (let i = 0; i < arr.length; i += 1) {
				console.log(arr[i])
			}
		`, outdent`
			for (const element of arr) {
				console.log(element)
			}
		`),

		testCase(outdent`
			for (let i = 0; arr.length > i; i += 1) {
				let el = arr[i];
				console.log(i, el);
			}
		`, outdent`
			for (let [i, el] of arr.entries()) {
				console.log(i, el);
			}
		`),

		testCase(outdent`
			for (let i = 0; i < arr.length; i++) {
				const el = arr[i];
				console.log(i, el);
			}
		`, outdent`
			for (const [i, el] of arr.entries()) {
				console.log(i, el);
			}
		`),

		testCase(outdent`
			for (let i = 0; i < arr.length; ++i) {
				const el = arr[i];
				console.log(i, el);
			}
		`, outdent`
			for (const [i, el] of arr.entries()) {
				console.log(i, el);
			}
		`),

		testCase(outdent`
			for (let i = 0; i < arr.length; i++) {
				const el = arr[i];
				console.log(el);
			}
		`, outdent`
			for (const el of arr) {
				console.log(el);
			}
		`),

		// This tests that the "whole line" removal does not happen when it should not
		testCase(outdent`
			for (var j = 0; j < xs.length; j = j + 1) {
				var x = xs[j];console.log(j, x);
			}
		`, outdent`
			for (var [j, x] of xs.entries()) {
				console.log(j, x);
			}
		`),

		// Index is used outside of the loop, fixer should not apply
		testCase(outdent`
			for (var i = 0; i < arr.length; i++) {
				const el = arr[i];
				console.log(el);
			}
			console.log(i);
		`),

		// Element is used outside of the loop, fixer should not apply
		testCase(outdent`
			for (let i = 0; i < arr.length; i++) {
				var el = arr[i];
				console.log(i, el);
			}
			console.log(el);
		`),

		// Complex element declarations
		testCase(outdent`
			for (var j = 0; j < xs.length; j = j + 1) {
				var x = xs[j], y = ys[j];
				console.log(j, x, y);
			}
		`, outdent`
			for (var [j, x] of xs.entries()) {
				var y = ys[j];
				console.log(j, x, y);
			}
		`),

		testCase(outdent`
			for (var j = 0; j < xs.length; j = j + 1) {
				var y = ys[j], x = xs[j];
				console.log(j, x, y);
			}
		`, outdent`
			for (var [j, x] of xs.entries()) {
				var y = ys[j];
				console.log(j, x, y);
			}
		`),

		testCase(outdent`
			for (var j = 0; j < xs.length; j = j + 1) {
				var y = ys[j], x = xs[j], i = 10;
				console.log(j, x, y);
			}
		`, outdent`
			for (var [j, x] of xs.entries()) {
				var y = ys[j], i = 10;
				console.log(j, x, y);
			}
		`),

		// Complex replacement without index
		testCase(outdent`
			for (var i = 0; i < arr.length; i++) {
				console.log(arr[i]);
				arr[i].doSomething();
				counter += arr[i].total;
				const z = arr[i];
			}
		`, outdent`
			for (const z of arr) {
				console.log(z);
				z.doSomething();
				counter += z.total;
			}
		`),

		// Complex replacement with index
		testCase(outdent`
			for (var i = 0; i < arr.length; i++) {
				console.log(arr[i]);
				arr[i].doSomething();
				counter += arr[i].total;
				const z = arr[i];
				const y = i + 1;
			}
		`, outdent`
			for (const [i, z] of arr.entries()) {
				console.log(z);
				z.doSomething();
				counter += z.total;
				const y = i + 1;
			}
		`),

		// Using array element in a child scope
		testCase(outdent`
			for (let i = 0; i < arr.length; i += 1) {
				console.log(arr[i])
				if (Map) {
					use(arr[i]);
				}
			}
		`, outdent`
			for (const element of arr) {
				console.log(element)
				if (Map) {
					use(element);
				}
			}
		`),

		// Destructuring assignment in usage:
		testCase(outdent`
			for (let i = 0; i < arr.length; i++) {
				const { a, b } = arr[i];
				console.log(a, b);
			}
		`, outdent`
			for (const { a, b } of arr) {
				console.log(a, b);
			}
		`),
		testCase(outdent`
			for (let i = 0; i < arr.length; i++) {
				const [ a, b ] = arr[i];
				console.log(a, b);
			}
		`, outdent`
			for (const [ a, b ] of arr) {
				console.log(a, b);
			}
		`),
		testCase(outdent`
			for (let i = 0; i < arr.length; i++) {
				var { a, b } = arr[i];
				console.log(a, b);
			}
		`, outdent`
			for (var { a, b } of arr) {
				console.log(a, b);
			}
		`),
		testCase(outdent`
			for (let i = 0; i < arr.length; i++) {
				var [ a, b ] = arr[i];
				console.log(a, b);
			}
		`, outdent`
			for (var [ a, b ] of arr) {
				console.log(a, b);
			}
		`),
		testCase(outdent`
			for (let i = 0; i < arr.length; i++) {
				let { a, b } = arr[i];
				console.log(a, b);
			}
		`, outdent`
			for (let { a, b } of arr) {
				console.log(a, b);
			}
		`),
		testCase(outdent`
			for (let i = 0; i < arr.length; i++) {
				let [ a, b ] = arr[i];
				console.log(a, b);
			}
		`, outdent`
			for (let [ a, b ] of arr) {
				console.log(a, b);
			}
		`),
		testCase(outdent`
			for (let i = 0; i < arr.length; i++) {
				var { a, b } = arr[i];
				console.log(i, a, b);
			}
		`, outdent`
			for (var [i, { a, b }] of arr.entries()) {
				console.log(i, a, b);
			}
		`),
		testCase(outdent`
			for (let i = 0; i < arr.length; i++) {
				var [ a, b ] = arr[i];
				console.log(i, a, b);
			}
		`, outdent`
			for (var [i, [ a, b ]] of arr.entries()) {
				console.log(i, a, b);
			}
		`),
		testCase(outdent`
			for (let i = 0; i < arr.length; i++) {
				const { a, b } = arr[i];
				console.log(a, b, i, arr[i]);
			}
		`, outdent`
			for (const [i, element] of arr.entries()) {
				const { a, b } = element;
				console.log(a, b, i, element);
			}
		`),
		testCase(outdent`
			for (let i = 0; i < arr.length; i++) {
				const [ a, b ] = arr[i];
				console.log(a, b, i, arr[i]);
			}
		`, outdent`
			for (const [i, element] of arr.entries()) {
				const [ a, b ] = element;
				console.log(a, b, i, element);
			}
		`),
		testCase(outdent`
			for (let i = 0; i < arr.length; i++) {
				const { a, b } = arr[i];
				console.log(a, b, arr[i]);
			}
		`, outdent`
			for (const element of arr) {
				const { a, b } = element;
				console.log(a, b, element);
			}
		`),
		testCase(outdent`
			for (let i = 0; i < arr.length; i++) {
				const [ a, b ] = arr[i];
				console.log(a, b, arr[i]);
			}
		`, outdent`
			for (const element of arr) {
				const [ a, b ] = element;
				console.log(a, b, element);
			}
		`),

		// Avoid naming collision when using default element name.
		testCase(outdent`
			for (let i = 0; i < arr.length; i += 1) {
				console.log(arr[i]);
				const element = foo();
				console.log(element);
			}
		`, outdent`
			for (const element_ of arr) {
				console.log(element_);
				const element = foo();
				console.log(element);
			}
		`),

		// Avoid naming collision when using default element name (different scope).
		testCase(outdent`
			function element(element_) {
				for (let i = 0; i < arr.length; i += 1) {
					console.log(arr[i], element);
				}
			}
		`, outdent`
			function element(element_) {
				for (const element__ of arr) {
					console.log(element__, element);
				}
			}
		`),
		testCase(outdent`
			let element;
			function foo() {
				for (let i = 0; i < arr.length; i += 1) {
					console.log(arr[i]);
				}
			}
		`, outdent`
			let element;
			function foo() {
				for (const element_ of arr) {
					console.log(element_);
				}
			}
		`),
		testCase(outdent`
			for (let i = 0; i < arr.length; i += 1) {
				function element__(element) {
					console.log(arr[i], element);
				}
			}
		`, outdent`
			for (const element_ of arr) {
				function element__(element) {
					console.log(element_, element);
				}
			}
		`),
		testCase(outdent`
			for (let i = 0; i < arr.length; i += 1) {
				function element_(element) {
					console.log(arr[i], element);
				}
			}
		`, outdent`
			for (const element__ of arr) {
				function element_(element) {
					console.log(element__, element);
				}
			}
		`),
		testCase(outdent`
			for (let i = 0; i < arr.length; i += 1) {
				function element() {
					console.log(arr[i], element);
				}
			}
		`, outdent`
			for (const element_ of arr) {
				function element() {
					console.log(element_, element);
				}
			}
		`),
		testCase(outdent`
			for (let i = 0; i < arr.length; i += 1) {
				console.log(arr[i], element);
			}
		`, outdent`
			for (const element_ of arr) {
				console.log(element_, element);
			}
		`),
		testCase(outdent`
			for (let i = 0; i < element.length; i += 1) {
				console.log(element[i]);
			}
		`, outdent`
			for (const element_ of element) {
				console.log(element_);
			}
		`),
		testCase(outdent`
			for (let i = 0; i < arr.length; i += 1) {
				console.log(arr[i]);
				function foo(element) {
					console.log(element);
				}
			}
		`, outdent`
			for (const element_ of arr) {
				console.log(element_);
				function foo(element) {
					console.log(element);
				}
			}
		`),
		testCase(outdent`
			for (let element = 0; element < arr.length; element += 1) {
				console.log(element, arr[element]);
			}
		`, outdent`
			for (const [element, element_] of arr.entries()) {
				console.log(element, element_);
			}
		`),
		testCase(outdent`
			for (let element = 0; element < arr.length; element += 1) {
				console.log(arr[element]);
			}
		`, outdent`
			for (const element_ of arr) {
				console.log(element_);
			}
		`),
		testCase(outdent`
			for (const element of arr) {
				for (let j = 0; j < arr2.length; j += 1) {
					console.log(element, arr2[j]);
				}
			}
		`, outdent`
			for (const element of arr) {
				for (const element_ of arr2) {
					console.log(element, element_);
				}
			}
		`),

		// Avoid naming collision when using default element name (multiple collisions).
		testCase(outdent`
			for (let i = 0; i < arr.length; i += 1) {
				const element = foo();
				console.log(arr[i]);
				const element_ = foo();
				console.log(element);
				console.log(element_);
			}
		`, outdent`
			for (const element__ of arr) {
				const element = foo();
				console.log(element__);
				const element_ = foo();
				console.log(element);
				console.log(element_);
			}
		`),

		// Singularization:
		...[
			['plugin', 'plugins'], // Simple
			['person', 'people'], // Irregular
			['girlsAndBoy', 'girlsAndBoys'], // Multiple plurals
			['largeCity', 'largeCities'], // CamelCase
			['LARGE_CITY', 'LARGE_CITIES'], // Caps, snake_case
			['element', 'news'], // No singular version, ends in s
			['element', 'list'], // No singular version
		].map(([elementName, arrayName]) =>
			testCase(
				`for(const i = 0; i < ${arrayName}.length; i++) {console.log(${arrayName}[i])}`,
				`for(const ${elementName} of ${arrayName}) {console.log(${elementName})}`,
			)),

		// Singularization (avoid using reserved JavaScript keywords):
		testCase(outdent`
			for (let i = 0; i < cases.length; i++) {
				console.log(cases[i]);
			}
		`, outdent`
			for (const case_ of cases) {
				console.log(case_);
			}
		`),
		// Singularization (avoid variable name collision):
		testCase(outdent`
			for (let i = 0; i < cities.length; i++) {
				console.log(cities[i]);
				const city = foo();
				console.log(city);
			}
		`, outdent`
			for (const city_ of cities) {
				console.log(city_);
				const city = foo();
				console.log(city);
			}
		`),
		// Singularization (uses i):
		testCase(outdent`
			for (let i = 0; i < cities.length; i++) {
				console.log(i, cities[i]);
			}
		`, outdent`
			for (const [i, city] of cities.entries()) {
				console.log(i, city);
			}
		`),

		// With static array variable.
		testCase(outdent`
			const someArray = [1,2,3];
			for (let i = 0; i < someArray.length; i++) {
				console.log(someArray[i]);
			}
		`, outdent`
			const someArray = [1,2,3];
			for (const element of someArray) {
				console.log(element);
			}
		`),

		// With non-static variable.
		testCase(outdent`
			const someArray = getSomeArray();
			for (let i = 0; i < someArray.length; i++) {
				console.log(someArray[i]);
			}
		`, outdent`
			const someArray = getSomeArray();
			for (const element of someArray) {
				console.log(element);
			}
		`),
		testCase(outdent`
			const visibleItems = document.getElementsByClassName('visible');
			for (let index = 0; index < visibleItems.length; index++) {
				console.log(visibleItems[index]);
			}
		`, outdent`
			const visibleItems = document.getElementsByClassName('visible');
			for (const visibleItem of visibleItems) {
				console.log(visibleItem);
			}
		`),
		testCase(outdent`
			const visibleItems = document.getElementsByClassName('visible');
			for (let index = 0; index < visibleItems.length; index++) {
				console.log(index, visibleItems[index]);
			}
		`),

		testCase(outdent`
			const links = document.getElementsByTagName('a');
			for (let index = 0; index < links.length; index++) {
				console.log(index, links[index]);
			}
		`),

		testCase(outdent`
			const links = document.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'a');
			for (let index = 0; index < links.length; index++) {
				console.log(index, links[index]);
			}
		`),

		testCase(outdent`
			for (let index = 0; index < unknownItems.length; index++) {
				console.log(index, unknownItems[index]);
			}
		`, outdent`
			for (const [index, unknownItem] of unknownItems.entries()) {
				console.log(index, unknownItem);
			}
		`),

		testCase(outdent`
			const document = {
				getElementsByClassName() {
					return ['visible'];
				},
			};
			const visibleItems = document.getElementsByClassName('visible');
			for (let index = 0; index < visibleItems.length; index++) {
				console.log(index, visibleItems[index]);
			}
		`, outdent`
			const document = {
				getElementsByClassName() {
					return ['visible'];
				},
			};
			const visibleItems = document.getElementsByClassName('visible');
			for (const [index, visibleItem] of visibleItems.entries()) {
				console.log(index, visibleItem);
			}
		`),
	],
});

test(avoidTestTitleConflict({
	testerOptions: {
		languageOptions: {
			sourceType: 'script',
			ecmaVersion: 5,
		},
	},
	valid: [
		'for (;;);',
		'for (;;) {}',
		'for (var j = 0; j < 10; j++) {}',
		outdent`
			for (i = 0; i < arr.length; i++) {
				el = arr[i];
				console.log(i, el);
			}
		`,
		outdent`
			var foo = function () {
				for (var i = 0; i < bar.length; i++) {
				}
			};
		`,
	],
	invalid: [],
}, 'es5'));

test.typescript({
	valid: [
		outdent`
			const str = '123'.slice(1);
			for (let i = 0; i < str.length; i++) {
				console.log(str[i], i);
			}
		`,
	],
	invalid: [
		// String type annotation with index usage - no autofix since `.entries()` doesn't exist on strings
		{
			code: outdent`
				function foo(formattedValue: string) {
					for (let i = 0; i < formattedValue.length; i++) {
						const char = formattedValue[i];
						console.log(\`Key: \${i} Value: \${char}\`);
					}
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				const text: string = getText();
				for (let i = 0; i < text.length; i++) {
					const char = text[i];
					console.log(i, char);
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				type Text = string;
				const text: Text = getText();
				for (let i = 0; i < text.length; i++) {
					const char = text[i];
					console.log(i, char);
				}
			`,
			errors: 1,
		},
		testCase(typeAnnotatedIndexUsage('HTMLAllCollection')),
		testCase(typeAnnotatedIndexUsage('HTMLCollectionOf<Element>')),
		testCase(typeAnnotatedIndexUsage('HTMLCollection')),
		{
			code: outdent`
				type Items = HTMLCollectionOf<Element>;
				function foo(items: Items) {
					for (let i = 0; i < items.length; i++) {
						console.log(i, items[i]);
					}
				}
			`,
			errors: 1,
		},
		testCase(typeAnnotatedIndexUsage('HTMLFormControlsCollection')),
		testCase(typeAnnotatedIndexUsage('HTMLFormElement', 'form')),
		testCase(typeAnnotatedIndexUsage('HTMLOptionsCollection')),
		testCase(typeAnnotatedIndexUsage('HTMLSelectElement')),
		// String type annotation without index usage - autofix works
		{
			code: outdent`
				function foo(formattedValue: string) {
					for (let i = 0; i < formattedValue.length; i++) {
						console.log(formattedValue[i]);
					}
				}
			`,
			output: outdent`
				function foo(formattedValue: string) {
					for (const element of formattedValue) {
						console.log(element);
					}
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				const text: string = getText();
				for (let i = 0; i < text.length; i++) {
					console.log(text[i]);
				}
			`,
			output: outdent`
				const text: string = getText();
				for (const element of text) {
					console.log(element);
				}
			`,
			errors: 1,
		},
		// Union type annotations containing `string` - no autofix since `.entries()` doesn't exist on strings
		{
			code: outdent`
				const text: string | string[] = getText();
				for (let i = 0; i < text.length; i++) {
					const char = text[i];
					console.log(i, char);
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				const text: string | Foo = getText();
				for (let i = 0; i < text.length; i++) {
					const char = text[i];
					console.log(i, char);
				}
			`,
			errors: 1,
		},
		// Array type annotations - autofix works normally including `.entries()`
		testCase(outdent`
			function foo(items: string[]) {
				for (let i = 0; i < items.length; i++) {
					console.log(i, items[i]);
				}
			}
		`, outdent`
			function foo(items: string[]) {
				for (const [i, item] of items.entries()) {
					console.log(i, item);
				}
			}
		`),
		testCase(outdent`
			function foo(items: string[]) {
				for (let i = 0, j = items.length; i < j; i++) {
					console.log(i, items[i]);
				}
			}
		`, outdent`
			function foo(items: string[]) {
				for (const [i, item] of items.entries()) {
					console.log(i, item);
				}
			}
		`),
		testCase(outdent`
			function foo(items: Array<string>) {
				for (let i = 0; i < items.length; i++) {
					console.log(i, items[i]);
				}
			}
		`, outdent`
			function foo(items: Array<string>) {
				for (const [i, item] of items.entries()) {
					console.log(i, item);
				}
			}
		`),
		testCase(outdent`
			function foo(items: ReadonlyArray<string>) {
				for (let i = 0; i < items.length; i++) {
					console.log(i, items[i]);
				}
			}
		`, outdent`
			function foo(items: ReadonlyArray<string>) {
				for (const [i, item] of items.entries()) {
					console.log(i, item);
				}
			}
		`),
		testCase(outdent`
			type Items = string[];
			function foo(items: Items) {
				for (let i = 0; i < items.length; i++) {
					console.log(i, items[i]);
				}
			}
		`, outdent`
			type Items = string[];
			function foo(items: Items) {
				for (const [i, item] of items.entries()) {
					console.log(i, item);
				}
			}
		`),
		testCase(outdent`
			function foo(items: readonly string[]) {
				for (let i = 0; i < items.length; i++) {
					console.log(i, items[i]);
				}
			}
		`, outdent`
			function foo(items: readonly string[]) {
				for (const [i, item] of items.entries()) {
					console.log(i, item);
				}
			}
		`),
		testCase(outdent`
			function foo(items: [string, string]) {
				for (let i = 0; i < items.length; i++) {
					console.log(i, items[i]);
				}
			}
		`, outdent`
			function foo(items: [string, string]) {
				for (const [i, item] of items.entries()) {
					console.log(i, item);
				}
			}
		`),
		// Intersection type annotations containing an array - autofix works including `.entries()`
		testCase(outdent`
			function foo(items: string[] & {foo: string}) {
				for (let i = 0; i < items.length; i++) {
					console.log(i, items[i]);
				}
			}
		`, outdent`
			function foo(items: string[] & {foo: string}) {
				for (const [i, item] of items.entries()) {
					console.log(i, item);
				}
			}
		`),
		// Unknown type annotation with index usage - autofix still applies
		testCase(outdent`
			function foo(items: Foo) {
				for (let i = 0; i < items.length; i++) {
					console.log(i, items[i]);
				}
			}
		`, outdent`
			function foo(items: Foo) {
				for (const [i, item] of items.entries()) {
					console.log(i, item);
				}
			}
		`),
		{
			code: outdent`
				function foo(text: string) {
					for (let i = 0, j = text.length; i < j; i++) {
						console.log(i, text[i]);
					}
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				function foo(text: string) {
					for (let i = 0, length = text.length; i < length; i++) {
						console.log(text[i]);
					}
				}
			`,
			output: outdent`
				function foo(text: string) {
					for (const element of text) {
						console.log(element);
					}
				}
			`,
			errors: 1,
		},
		{
			// https://github.com/microsoft/vscode/blob/cf9ac85214c3f1d3d0b80cc503ff7498f2b3ea2f/src/vs/workbench/api/common/extHostLanguageFeatures.ts#L1207
			code: outdent`
				for (let i = 0; i < positions.length; i++) {
					let last: vscode.Position | vscode.Range = positions[i];
					let selectionRange = allProviderRanges[i];
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				for (let i = 0; i < positions.length; i++) {
					const    last   /* comment */    : /* comment */ Position = positions[i];
					console.log(i);
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				for (let i = 0; i < positions.length; i++) {
					let last: vscode.Position | vscode.Range = positions[i];
				}
			`,
			errors: 1,
		},
	],
});

test({
	valid: [],
	invalid: [
		typeAware(outdent`
			const visibleItems = document.getElementsByClassName('visible');
			for (let index = 0; index < visibleItems.length; index++) {
				console.log(index, visibleItems[index]);
			}
		`),
		typeAware(outdent`
			declare function getItems(): string[];
			const items = getItems();
			for (let index = 0; index < items.length; index++) {
				console.log(index, items[index]);
			}
		`, outdent`
			declare function getItems(): string[];
			const items = getItems();
			for (const [index, item] of items.entries()) {
				console.log(index, item);
			}
		`),
		typeAware(outdent`
			declare const nodes: NodeListOf<Element>;
			for (let index = 0; index < nodes.length; index++) {
				console.log(index, nodes[index]);
			}
		`, outdent`
			declare const nodes: NodeListOf<Element>;
			for (const [index, node] of nodes.entries()) {
				console.log(index, node);
			}
		`),
		typeAware(outdent`
			declare const bytes: Uint8Array;
			for (let index = 0; index < bytes.length; index++) {
				console.log(index, bytes[index]);
			}
		`, outdent`
			declare const bytes: Uint8Array;
			for (const [index, byte] of bytes.entries()) {
				console.log(index, byte);
			}
		`),
		typeAware(outdent`
			interface Collection<T> {
				length: number;
				[index: number]: T;
			}
			declare const items: Collection<string>;
			for (let index = 0; index < items.length; index++) {
				console.log(index, items[index]);
			}
		`),
		typeAware(outdent`
			interface Collection<T> {
				length: number;
				[index: number]: T;
				entries: number;
			}
			declare const items: Collection<string>;
			for (let index = 0; index < items.length; index++) {
				console.log(index, items[index]);
			}
		`),
		typeAware(outdent`
			interface Collection<T> {
				length: number;
				[index: number]: T;
				entries(): void;
			}
			declare const items: Collection<string>;
			for (let index = 0; index < items.length; index++) {
				console.log(index, items[index]);
			}
		`),
		typeAware(outdent`
			interface Collection<T> {
				length: number;
				[index: number]: T;
				entries(): IterableIterator<T>;
			}
			declare const items: Collection<string>;
			for (let index = 0; index < items.length; index++) {
				console.log(index, items[index]);
			}
		`),
		typeAware(outdent`
			interface Collection<T> {
				length: number;
				[index: number]: T;
				entries(): IterableIterator<[number, T]>;
			}
			declare const items: Collection<string>;
			for (let index = 0; index < items.length; index++) {
				console.log(index, items[index]);
			}
		`, outdent`
			interface Collection<T> {
				length: number;
				[index: number]: T;
				entries(): IterableIterator<[number, T]>;
			}
			declare const items: Collection<string>;
			for (const [index, item] of items.entries()) {
				console.log(index, item);
			}
		`),
	],
});

test.snapshot({
	valid: [],
	invalid: [
		outdent`
			for (let i = 0; i < arr.length; i += 1) {
				console.log(arr[i])
			}
		`,
		// #742
		outdent`
			for (let i = 0; i < plugins.length; i++) {
				let plugin = plugins[i];
				plugin = calculateSomeNewValue();
				// ...
			}
		`,
		outdent`
			for (
				let i = 0;
				i < array.length;
				i++
			)
			// comment (foo)
				{
					var foo = array[i];
					foo = bar();
				}
		`,
		outdent`
			for (let i = 0; i < array.length; i++) {
				let foo = array[i];
			}
		`,
		outdent`
			for (let i = 0; i < array.length; i++) {
				const foo = array[i];
			}
		`,
		outdent`
			for (let i = 0; i < array.length; i++) {
				var foo = array[i], bar = 1;
			}
		`,
	],
});

// A comment between the header clauses is destroyed by the fix, so it must block it
test({
	valid: [],
	invalid: [
		{
			code: 'for (let i = 0; i < array.length /* c */; i++) {\n\tvar foo = array[i];\n}',
			errors: 1,
		},
		{
			code: 'for (let i = 0 /* c */; i < array.length; i++) {\n\tvar foo = array[i];\n}',
			errors: 1,
		},
		{
			code: 'for (\n\tlet i = 0;\n\ti < array.length;\n\t// c\n\ti++\n) {\n\tvar foo = array[i];\n}',
			errors: 1,
		},
		{
			code: 'for (let i = 0, n = array.length; i < n /* c */; i++) {\n\tvar foo = array[i];\n}',
			errors: 1,
		},
	],
});

// The element declarators are removed or rewritten, a comment would be lost
test({
	valid: [],
	invalid: [
		{
			code: 'for (var j = 0; j < xs.length; j++) {\n\tvar x = xs[j], /* c */ y = ys[j];\n\tconsole.log(j, x, y);\n}',
			errors: 1,
		},
		{
			code: 'for (let i = 0; i < xs.length; i++) {\n\tconst x = /* c */ xs[i];\n\tconsole.log(i, x);\n}',
			errors: 1,
		},
		{
			code: 'for (let i = 0; i < xs.length; i++) {\n\tconst x = xs[i] /* c */;\n\tconsole.log(i, x);\n}',
			errors: 1,
		},
		{
			code: 'for (let i = 0; i < xs.length; i++) {\n\tconst /* c */ x = xs[i];\n\tconsole.log(i, x);\n}',
			errors: 1,
		},
		{
			code: 'for (let i = 0; i < xs.length; i++) {\n\tvar /* c */ x = xs[i];\n\tconsole.log(i, x);\n}',
			errors: 1,
		},
		{
			code: 'for (let i = 0; i < xs.length; i++) {\n\tconst x = xs[i]; /* c */\n\tconsole.log(x);\n}',
			output: 'for (const x of xs) {\n\t /* c */\n\tconsole.log(x);\n}',
			errors: 1,
		},
		{
			code: 'for (let i = 0; i < xs.length; i++) {\n\tconst x = xs[i];\n\tconsole.log(i, x);\n}',
			output: 'for (const [i, x] of xs.entries()) {\n\tconsole.log(i, x);\n}',
			errors: 1,
		},
	],
});

// `arr[i]` is a write when it is an assignment or destructuring target
test({
	valid: [
		'const arr = [1, 2];\nconst other = [9];\nfor (let i = 0; i < arr.length; i++) {\n\t[arr[i]] = other;\n\tlog(arr[i]);\n}',
		'const arr = [1, 2];\nconst other = [9];\nfor (let i = 0; i < arr.length; i++) {\n\t({x: arr[i]} = other);\n\tlog(arr[i]);\n}',
		'const arr = [1, 2];\nconst other = [9];\nfor (let i = 0; i < arr.length; i++) {\n\t[[arr[i]]] = other;\n\tlog(arr[i]);\n}',
		'const arr = [1, 2];\nconst other = [9];\nfor (let i = 0; i < arr.length; i++) {\n\t[...arr[i]] = other;\n\tlog(arr[i]);\n}',
		'const arr = [1, 2];\nfor (let i = 0; i < arr.length; i++) {\n\tconst [a] = arr;\n\tlog(arr[i]);\n}',
	],
	invalid: [
		{
			code: 'const arr = [1, 2];\nfor (let i = 0; i < arr.length; i++) {\n\tlog(arr[i]);\n}',
			output: 'const arr = [1, 2];\nfor (const element of arr) {\n\tlog(element);\n}',
			errors: 1,
		},
	],
});

// A declaration kind does not matter, a known no-entries collection has no `.entries()`
test({
	valid: [],
	invalid: [
		// Every method that returns an `HTMLCollection`
		...[
			['let', 'document.getElementsByClassName(\'visible\')', 'visibleItems'],
			['let', 'document.getElementsByTagName(\'a\')', 'links'],
			['let', 'document.getElementsByTagNameNS(\'*\', \'a\')', 'links'],
		].map(([kind, call, name]) => ({
			code: outdent`
				${kind} ${name} = ${call};
				for (let index = 0; index < ${name}.length; index++) {
					console.log(index, ${name}[index]);
				}
			`,
			languageOptions: {globals: {document: 'readonly'}},
			errors: 1,
		})),
		{
			code: outdent`
				var visibleItems = document.getElementsByClassName('visible');
				for (let index = 0; index < visibleItems.length; index++) {
					console.log(index, visibleItems[index]);
				}
			`,
			languageOptions: {globals: {document: 'readonly'}},
			errors: 1,
		},
	],
});

// The parentheses around the update are not part of its range, the new head must cover them
test.snapshot({
	valid: [],
	invalid: [
		'for (let index = 0; index < array.length; (index++)) { const element = array[index]; console.log(index, element); }',
		'for (let index = 0; index < array.length; (index)++) { const element = array[index]; console.log(index, element); }',
	],
});

// The element name must resolve to the loop head binding at every rewritten reference
test({
	valid: [],
	invalid: [
		// A second element declarator in another block would become `const element = element`
		{
			code: 'for (let i = 0; i < arr.length; i++) {\n\t{ const element = arr[i]; log(element); }\n\t{ const element = arr[i]; log(element); }\n}',
			errors: 1,
		},
		// A nested block declares the element name, the loop head would shadow the outer `element`
		{
			code: 'function f(element) {\n\tfor (let i = 0; i < arr.length; i++) {\n\t\tlog(element);\n\t\t{ const element = arr[i]; log(element); }\n\t}\n}',
			errors: 1,
		},
		// A nested block declares the element name, a rewritten reference would resolve to it
		{
			code: 'for (let i = 0; i < arr.length; i++) {\n\t{ const x = 1; log(arr[i]); }\n\tconst x = arr[i];\n}',
			errors: 1,
		},
		// More than one element declarator in the same scope
		{
			code: 'for (let i = 0; i < arr.length; i++) {\n\tconst x = arr[i], y = arr[i];\n\tlog(x, y);\n}',
			output: 'for (const x of arr) {\n\tconst y = x;\n\tlog(x, y);\n}',
			errors: 1,
		},
		{
			code: 'for (let i = 0; i < arr.length; i++) {\n\tconst x = arr[i];\n\tconst y = arr[i];\n\tlog(i, x, y);\n}',
			output: 'for (const [i, x] of arr.entries()) {\n\tconst y = x;\n\tlog(i, x, y);\n}',
			errors: 1,
		},
		{
			code: 'for (let i = 0; i < arr.length; i++) {\n\tconst {a} = arr[i], {b} = arr[i];\n\tlog(a, b);\n}',
			output: 'for (const element of arr) {\n\tconst {a} = element, {b} = element;\n\tlog(a, b);\n}',
			errors: 1,
		},
	],
});

// A rewritten `array[index]` would lose its comment
test({
	valid: [],
	invalid: [
		{
			code: 'for (let i = 0; i < arr.length; i++) {\n\tlog(arr[/* c */ i]);\n}',
			errors: 1,
		},
		{
			code: 'for (let i = 0; i < arr.length; i++) {\n\tconst x = arr[i];\n\tlog(x, arr[i /* c */]);\n}',
			errors: 1,
		},
		{
			code: 'for (let i = 0; i < arr.length; i++) {\n\tconst [a] = arr[/* c */ i];\n\tlog(a, arr[i]);\n}',
			errors: 1,
		},
		// A comment next to a kept declarator is not lost
		{
			code: 'for (let i = 0; i < arr.length; i++) {\n\tconst x = arr[i], y = 1 /* c */;\n\tlog(x, y);\n}',
			output: 'for (const x of arr) {\n\tconst y = 1 /* c */;\n\tlog(x, y);\n}',
			errors: 1,
		},
		{
			code: 'for (let i = 0; i < arr.length; i++) {\n\tconst [a] = arr[i], /* c */ b = 1;\n\tlog(a, b, arr[i]);\n}',
			output: 'for (const element of arr) {\n\tconst [a] = element, /* c */ b = 1;\n\tlog(a, b, element);\n}',
			errors: 1,
		},
	],
});

// A `NodeList` has `.entries()`
test({
	valid: [],
	invalid: [
		...[
			'document.querySelectorAll(\'a\')',
			'document.getElementsByName(\'name\')',
		].map(call => ({
			code: outdent`
				const links = ${call};
				for (let index = 0; index < links.length; index++) {
					console.log(index, links[index]);
				}
			`,
			output: outdent`
				const links = ${call};
				for (const [index, link] of links.entries()) {
					console.log(index, link);
				}
			`,
			languageOptions: {globals: {document: 'readonly'}},
			errors: 1,
		})),
	],
});

// A reassigned element would change what a rewritten `array[index]` reads
test({
	valid: [],
	invalid: [
		{
			code: 'for (let i = 0; i < arr.length; i++) {\n\tlet x = arr[i];\n\tx = 2;\n\tlog(arr[i]);\n}',
			errors: 1,
		},
		{
			code: 'for (let i = 0; i < arr.length; i++) {\n\tlet x = arr[i];\n\tx++;\n\tconst y = arr[i];\n\tlog(x, y);\n}',
			errors: 1,
		},
		{
			code: 'for (let i = 0; i < arr.length; i++) {\n\tlet x = arr[i];\n\tx = 2;\n\tlog(x);\n}',
			output: 'for (let x of arr) {\n\tx = 2;\n\tlog(x);\n}',
			errors: 1,
		},
	],
});

// Type annotations decide whether `.entries()` exists
const typeAnnotatedIndexUsageFixed = (type, parameterName = 'items') => [
	`function foo(${parameterName}: ${type}) {`,
	`\tfor (const [i, item] of ${parameterName}.entries()) {`,
	'\t\tconsole.log(i, item);',
	'\t}',
	'}',
].join('\n');

const loopWithIndexUsage = [
	'for (let i = 0; i < items.length; i++) {',
	'\tconsole.log(i, items[i]);',
	'}',
].join('\n');

test.typescript({
	valid: [],
	invalid: [
		testCase(typeAnnotatedIndexUsage('string[] | number[]'), typeAnnotatedIndexUsageFixed('string[] | number[]')),
		testCase(typeAnnotatedIndexUsage('Array<string> | string')),
		testCase(typeAnnotatedIndexUsage('ReadonlyArray<string>'), typeAnnotatedIndexUsageFixed('ReadonlyArray<string>')),
		testCase(typeAnnotatedIndexUsage('string[] | Foo'), typeAnnotatedIndexUsageFixed('string[] | Foo')),
		testCase(typeAnnotatedIndexUsage('string & number')),
		testCase(typeAnnotatedIndexUsage('string[] & Foo'), typeAnnotatedIndexUsageFixed('string[] & Foo')),
		testCase(typeAnnotatedIndexUsage('Foo & Bar'), typeAnnotatedIndexUsageFixed('Foo & Bar')),
		testCase(typeAnnotatedIndexUsage('Foo.Bar'), typeAnnotatedIndexUsageFixed('Foo.Bar')),
		testCase(typeAnnotatedIndexUsage('readonly string[]'), typeAnnotatedIndexUsageFixed('readonly string[]')),
		testCase(typeAnnotatedIndexUsage('readonly string[] | string')),
		testCase(typeAnnotatedIndexUsage('keyof Foo'), typeAnnotatedIndexUsageFixed('keyof Foo')),
		// Recursive type alias
		testCase(`type Items = Items | string;\n${typeAnnotatedIndexUsage('Items')}`),
		testCase(`interface Items {}\n${typeAnnotatedIndexUsage('Items')}`, `interface Items {}\n${typeAnnotatedIndexUsageFixed('Items')}`),
		testCase(typeAnnotatedIndexUsage('T').replace('function foo(', 'function foo<T extends string>(')),
		testCase(`const items = foo as string;\n${loopWithIndexUsage}`),
		testCase(`const items = <string>foo;\n${loopWithIndexUsage}`),
		testCase(`const text: string = foo;\nconst items = text as Foo;\n${loopWithIndexUsage}`),
		testCase(`const text: string = foo;\nconst items = text!;\n${loopWithIndexUsage}`),
		testCase(`const text: string = foo;\nconst items = text satisfies string;\n${loopWithIndexUsage}`),
		testCase(`const text: string = foo;\nconst items = (0, text);\n${loopWithIndexUsage}`),
		testCase(`const text: string = foo;\nconst items = bar ? text : text;\n${loopWithIndexUsage}`),
	],
});

test({
	valid: [
		// A `let` that is never reassigned still has a static string value
		'let items = \'abc\';\nfor (let i = 0; i < items.length; i++) {\n\tconsole.log(i, items[i]);\n}',
		// A static string from a call
		'const items = String(1);\nfor (let i = 0; i < items.length; i++) {\n\tconsole.log(i, items[i]);\n}',
	],
	invalid: [
		testCase(
			'let items = [1, 2];\nfor (let i = 0; i < items.length; i++) {\n\tconsole.log(i, items[i]);\n}',
			'let items = [1, 2];\nfor (const [i, item] of items.entries()) {\n\tconsole.log(i, item);\n}',
		),
		testCase(
			'for (let i = 0; i < items.length; i = 1 + i) {\n\tconsole.log(items[i]);\n}',
			'for (const item of items) {\n\tconsole.log(item);\n}',
		),
		testCase(
			'for (let i = 0; i < items.length; i++) {\n\tconsole.log({a: items[i]});\n}',
			'for (const item of items) {\n\tconsole.log({a: item});\n}',
		),
		testCase(
			'for (let i = 0; i < items.length; i++) {\n\tconsole.log([items[i]]);\n}',
			'for (const item of items) {\n\tconsole.log([item]);\n}',
		),
	],
});

const collectionWithEntries = (entriesReturnType, prefix = '') => outdent`
	${prefix}interface Collection<T> {
		length: number;
		[index: number]: T;
		entries(): ${entriesReturnType};
	}
	declare const items: Collection<string>;
	for (let index = 0; index < items.length; index++) {
		console.log(index, items[index]);
	}
`;

const collectionWithEntriesFixed = (entriesReturnType, prefix = '') => outdent`
	${prefix}interface Collection<T> {
		length: number;
		[index: number]: T;
		entries(): ${entriesReturnType};
	}
	declare const items: Collection<string>;
	for (const [index, item] of items.entries()) {
		console.log(index, item);
	}
`;

const typeAwareLoop = prefix => `${prefix}\nfor (let index = 0; index < items.length; index++) {\n\tconsole.log(index, items[index]);\n}`;
const typeAwareLoopFixed = prefix => `${prefix}\nfor (const [index, item] of items.entries()) {\n\tconsole.log(index, item);\n}`;
const entryIteratorWithEntryValue = 'interface EntryIterator {\n\tnext(): {value: [number, string]; done: boolean};\n}\n';
const entryIteratorWithStringValue = 'interface EntryIterator {\n\tnext(): {value: string; done: boolean};\n}\n';
const entryIteratorWithoutValue = 'interface EntryIterator {\n\tnext(): {done: boolean};\n}\n';

test({
	valid: [],
	invalid: [
		typeAware(collectionWithEntries('IterableIterator<any>'), collectionWithEntriesFixed('IterableIterator<any>')),
		typeAware(collectionWithEntries('IterableIterator<[number, string] | undefined>'), collectionWithEntriesFixed('IterableIterator<[number, string] | undefined>')),
		typeAware(collectionWithEntries('IterableIterator<null | undefined>'), collectionWithEntriesFixed('IterableIterator<null | undefined>')),
		typeAware(collectionWithEntries('IterableIterator<string | undefined>')),
		// An iterator without type arguments, the entry type comes from `next().value`
		typeAware(collectionWithEntries('EntryIterator', entryIteratorWithEntryValue), collectionWithEntriesFixed('EntryIterator', entryIteratorWithEntryValue)),
		typeAware(collectionWithEntries('EntryIterator', entryIteratorWithStringValue)),
		typeAware(collectionWithEntries('EntryIterator', entryIteratorWithoutValue), collectionWithEntriesFixed('EntryIterator', entryIteratorWithoutValue)),
		typeAware(collectionWithEntries('any'), collectionWithEntriesFixed('any')),
		typeAware(collectionWithEntries('[number, string][] | string[]')),
		typeAware(typeAwareLoop('declare const items: any;'), typeAwareLoopFixed('declare const items: any;')),
		typeAware(typeAwareLoop('function foo<T extends string[]>(items: T) {') + '\n}', typeAwareLoopFixed('function foo<T extends string[]>(items: T) {') + '\n}'),
		typeAware(typeAwareLoop('function foo<T extends string>(items: T) {') + '\n}'),
		typeAware(typeAwareLoop('function foo<T>(items: T) {') + '\n}', typeAwareLoopFixed('function foo<T>(items: T) {') + '\n}'),
		typeAware(typeAwareLoop('declare const items: string[] | Uint8Array;'), typeAwareLoopFixed('declare const items: string[] | Uint8Array;')),
		typeAware(typeAwareLoop('declare const items: string[] | string;')),
		typeAware(typeAwareLoop('declare const items: string & {extra: true};')),
		typeAware(typeAwareLoop('declare const items: string[] & {extra: true};'), typeAwareLoopFixed('declare const items: string[] & {extra: true};')),
		typeAware(typeAwareLoop('declare const items: [string, number];'), typeAwareLoopFixed('declare const items: [string, number];')),
		// The base constraint of `T['items']`
		typeAware(typeAwareLoop('function foo<T extends {items: string}>(items: T[\'items\']) {') + '\n}'),
		typeAware(typeAwareLoop('function foo<T extends {items: string[]}>(items: T[\'items\']) {') + '\n}', typeAwareLoopFixed('function foo<T extends {items: string[]}>(items: T[\'items\']) {') + '\n}'),
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'type List = HTMLCollection; type Alias = List; { type List = Alias; function f(list: List) { for (let i = 0; i < list.length; i++) { console.log(i, list[i]); } } }',
			languageOptions: {parser: typescriptEslintParser},
			errors: 1,
		},
		{
			code: 'type List = HTMLCollection; type Alias = List; { type List = string[]; function f(list: Alias) { for (let i = 0; i < list.length; i++) { console.log(i, list[i]); } } }',
			languageOptions: {parser: typescriptEslintParser},
			errors: 1,
		},
	],
});
