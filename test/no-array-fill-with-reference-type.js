import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const foo = "🦄";',
		'new Array(3).fill(0);        // ✓ number (primitive)  ',
		'new Array(3).fill(10n);        // ✓ bigint (primitive)  ',
		'new Array(3).fill(null);     // ✓ null (primitive)  ',
		'new Array(3).fill(undefined);     // ✓ undefined(primitive)  ',
		'new Array(3).fill(\'foo\');        // ✓ string (primitive)  ',
		'new Array(3).fill(``);        // ✓ TemplateLiteral (primitive)  ',
		// eslint-disable-next-line no-template-curly-in-string
		'new Array(3).fill(`${10}`);        // ✓ TemplateLiteral (primitive)',
		// eslint-disable-next-line no-template-curly-in-string
		'const foo = "foo"; new Array(3).fill(`Hi ${foo}`);        // ✓ TemplateLiteral (primitive)',
		'new Array(3).fill(false);     // ✓ boolean (primitive)  ',
		'new Array(3).fill(Symbol(\'foo\'));        // ✓ Symbol(primitive)  ',

		'Array.from({ length: 3 }, () => ({})); // ✓ Safe alternative',
		'Array.from({ length: 3 }, () => { return {} }); // ✓ Safe alternative',
		'Array.from({ length: 3 }, () => (new Map)); // ✓ Safe alternative',
		'Array.from({ length: 3 }, () => { return new Map }); // ✓ Safe alternative',
		'Array.from({ length: 33 }, () => { return new Map() }); // ✓ Safe alternative',

		'Array(3).fill(0);        // ✓ number (primitive)',
		'new Foo(3).fill({});       // ✓ Not Array',
		'Foo(3).fill({});       // ✓ Not Array',

		// Should be invalid but will pass.
		// Due to the rule name it will not check other than `Array.fill` or `Array.from`.
		// Too hard to implement exhaustive check.
		`
		const map = new Map();
		const list = [];
		for (let i = 0; i < 3; i++) {
			list.push(map);
		}
		`,

		'const foo = 0; new Array(8).fill(foo);',

		// Not check functions
		// function expression
		'new Array(1).fill(() => 1);',
		'new Array(2).fill(() => {});',
		`new Array(3).fill(() => {
			return {}
		});`,
		'new Array(4).fill(function () {});',

		// Set allowFunctions explicitly to true
		{
			code: 'new Array(41).fill(function () {});',
			options: [{
				allowFunctions: true,
			}],
		},

		// Function declaration
		'const foo = () => 0; new Array(5).fill(foo);',
		'const foo = function () {}; new Array(6).fill(foo);',
		'function foo() {}; new Array(7).fill(foo);',

		// RegExp is not check by default
		'new Array(3).fill(/pattern/);',
		'new Array(3).fill(new RegExp("pattern"));',
		'const p = /pattern/; new Array(3).fill(p);',
		'const p = new RegExp("pattern"); new Array(3).fill(p);',

		// [undefined, undefined, undefined]
		'Array.from({ length: 3 }, () => {});',

		`let a = []
		a = 2
		new Array(3).fill(a)`,

		// Not check `let` variables even if it is reference value but it can be reassigned
		'let foo = []; Array(3).fill(foo);',

		// Valid because it returns a new map every time
		`
		const map = new Map();
		const list = Array.from({ length: 3 }, () => {
			const map = new Map();
			return map
		});
		`,

		// It should be invalid because it return reference to the same map `outerMap`, but we cannot check every corner case
		`
		const outerMap = new Map();
		const list = Array.from({ length: 3 }, () => {
			const map = outerMap;
			return map
		});
		`,

		`
		const error = {
			messageId: 'prefer-negative-index',
		};
		Array.from({length: 4}, () => {
			return { ...error  }
		});
		`,

		// Case from integration failed test
		// https://github.com/sindresorhus/eslint-plugin-unicorn/actions/runs/15963375449/job/45019476320?pr=2661#step:5:139
		`
		import { ref } from 'vue'

		let id = 0

		const dataGenerator = () => ({
			id: \`random-id-$\{++id}\`,
			name: 'Tom',
			date: '2020-10-1',
		})

		const data = ref(Array.from({ length: 200 }).map(dataGenerator))
		`,

		// Not crash for variable `dataGenerator404` not found
		(`
		import { ref } from 'vue'

		let id = 0

		const dataGenerator = () => ({
			id: \`random-id-$\{++id}\`,
			name: 'Tom',
			date: '2020-10-1',
		})

		const data = ref(Array.from({ length: 200 }).map(dataGenerator404))
		`),

		(`
		import { ref } from 'vue'

		let id = 0

		const dataGenerator = {
			id: \`random-id-$\{++id}\`,
			name: 'Tom',
			date: '2020-10-1',
		}

		const data = ref(Array.from({ length: 200 }).map(dataGenerator))
		`),

		// https://github.com/vercel/next.js/blob/canary/packages/next/src/build/turborepo-access-trace/result.ts#L33C11-L33C47
		'Array.from(this.fsPaths).map(String)',
		// https://github.com/angular/angular/blob/main/devtools/projects/ng-devtools-backend/src/lib/component-tree/component-tree.ts#L553
		`
		import {
			buildDirectiveTree,
			getLViewFromDirectiveOrElementInstance,
		} from '../directive-forest/index';

		export const buildDirectiveForest = () => {
			const roots = getRoots();
			return Array.prototype.concat.apply([], Array.from(roots).map(buildDirectiveTree));
		};`,

		// https://github.com/microsoft/vscode/blob/main/src/vs/base/test/common/map.test.ts#L527
		'assert.deepStrictEqual(Array.from(map.keys()).map(String), [fileA].map(String));',

		// Will not check this even if sharedObj is a reference type
		`
		const foo = 1, sharedObj = {
			name: 'Tom',
			date: '2020-10-1',
		};

		let dataGenerator = () => 1; // because findVariable only find the first variable

		dataGenerator = () => (sharedObj);

		const data = Array.from({ length: 200 }).map(dataGenerator)
		`,

		// This is valid since sharedObj is overwritten to a primitive value.
		`
		let sharedObj = {
			name: 'Tom',
			date: '2020-10-1',
		};

		sharedObj = 1;

		let dataGenerator = () => sharedObj;

		const data = Array.from({ length: 200 }).map(dataGenerator)
		`,

		// This should be invalid since sharedObj is overwritten to a reference value.
		// but we will not check this corner case.
		`
		let sharedObj = 1;

		sharedObj = {
			name: 'Tom',
			date: '2020-10-1',
		};

		// let dataGenerator = () => sharedObj;

		const data = Array.from({ length: 200 }).map(() => sharedObj);
		`,
	],
	invalid: [
		'new Array(3).fill([]);', // ✗ Array
		'new Array(3).fill(Array());', // ✗ Array
		'new Array(3).fill(new Array());', // ✗ Array
		'new Array(3).fill({});       // ✗ Object  ',
		'new Array(3).fill(new Map());       // ✗ Map',
		'new Array(3).fill(new Set());       // ✗ Set',

		{
			code: 'new Array(3).fill(/pattern/); // ✗ RegExp',
			options: [{
				allowRegularExpressions: false,
			}],
		},
		{
			code: 'new Array(3).fill(new RegExp("pattern")); // ✗ RegExp',
			options: [{
				allowRegularExpressions: false,
			}],
		},
		{
			code: 'const p = /pattern/; new Array(3).fill(p); // ✗ RegExp',
			options: [{
				allowRegularExpressions: false,
			}],
		},
		{
			code: 'const p = new RegExp("pattern"); new Array(3).fill(p); // ✗ RegExp',
			options: [{
				allowRegularExpressions: false,
			}],
		},

		'new Array(3).fill(new String(\'fff\'));       // ✗ new String',

		'new Array(3).fill(new Foo(\'fff\'));       // ✗ new Class',
		'class BarClass {}; new Array(3).fill(BarClass);       // ✗ Class',
		'class BarClass {}; new Array(3).fill(new BarClass());       // ✗ Class instance',

		'const map = new Map(); new Array(3).fill(map);      // ✗ Variable (map)',

		'Array(3).fill({});       // ✗ Object  ',
		// ✗ Object
		'Array.from({ length: 3 }).fill({});',

		'new Array(3).fill(new Date())',
		'Array.from({ length: 3 }).fill(new Date())',

		'Array.from({length: 3}).fill(createError(\'no\', \'yes\')[0])',
		'const initialArray = []; new Array(3).fill(initialArray); // ✗ Variable (array)',

		// Should not fill with function
		{
			code: 'new Array(3).fill(() => 1);',
			options: [{
				allowFunctions: false,
			}],
		},
		{
			code: 'new Array(3).fill(() => {});',
			options: [{
				allowFunctions: false,
			}],
		},
		{
			code: 'new Array(3).fill(() => { return {} });',
			options: [{
				allowFunctions: false,
			}],
		},
		{
			code: 'new Array(3).fill(function () {});',
			options: [{
				allowFunctions: false,
			}],
		},

		'new Array(3).fill(new class {});',
		'new Array(3).fill(new A.B());',
		'const cls = new class {}; new Array(3).fill(cls);',

		'const obj = {}; Array.from({ length: 3 }).fill(obj);',

		// Variable declared in parent scope
		'const map = new Map({ foo: "bar" }); Array.from({ length: 3 }, () => map);',

		// Variable declared in its grand parent scope
		'const map = new Map({ foo: "bar" }); if (true) { const initialArray = Array.from({ length: 3 }, () => map); }',
		'function getMap() { return new Map({ foo: "bar" }); } const map = getMap(); if (true) { const initialArray = Array.from({ length: 3 }, () => map); }',

		// `initialArray` is filled with no reference type (literal string) but will be treated as such because it is a function calling
		// we will not dive deep into the function body to check if it returns a reference type
		'function getMap() { return "literal string" } const map = getMap(); if (true) { const initialArray = Array.from({ length: 3 }, () => map); }',

		`
		const object = {}
		Array.from({length: 3}, () => object)
		`,

		'const object = {}; Array.from({length: 31}).map(() => object);',

		// Case from integration failed test
		// https://github.com/sindresorhus/eslint-plugin-unicorn/actions/runs/15963375449/job/45019476320?pr=2661#step:5:139
		`
		import { ref } from 'vue'

		let id = 0

		const sharedObj = {
			id: \`random-id-$\{++id}\`,
			name: 'Tom',
			date: '2020-10-1',
		}

		const dataGenerator = () => (sharedObj)

		const data = ref(Array.from({ length: 200 }).map(dataGenerator))
		`,
	],
});
