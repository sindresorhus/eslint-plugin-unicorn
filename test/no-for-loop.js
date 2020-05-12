import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/no-for-loop';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

const ruleTesterEs5 = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 5
	}
});

function testCase(code, output) {
	return {
		code,
		output: output || code,
		errors: [{}]
	};
}

ruleTester.run('no-for-loop', rule, {
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
		`
	],

	invalid: [
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
			for (const [i, el] of arr.entries()) {
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
			for (const [j, x] of xs.entries()) {
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
			for (const [j, x] of xs.entries()) {
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
			for (const [j, x] of xs.entries()) {
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
			for (const [j, x] of xs.entries()) {
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
		`)
	]
});

ruleTesterEs5.run('no-for-loop', rule, {
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
		`
	],
	invalid: []
});
