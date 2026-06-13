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
		'const notArray = 123; for (let i = 0; i < notArray.length; i++) { console.log(notArray[i]); }',
		'const notArray = true; for (let i = 0; i < notArray.length; i++) { console.log(notArray[i]); }',
	],

	invalid: [
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
