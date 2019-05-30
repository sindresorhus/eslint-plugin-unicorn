import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-for-loop';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2019
	}
});

function testCase(code, output) {
	return {
		code,
		output: output || code,
		errors: [{ruleId: 'no-for-loop'}]
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
		`for (i = 0; i < arr.length; i++) {
			el = arr[i];
			console.log(i, el);
		}`,

		// Screwing with initialization expression

		`for (let i = 0, j = 0; i < arr.length; i++) {
			const el = arr[i];
			console.log(i, el);
		}`,
		`for (let {i} = 0; i < arr.length; i++) {
			const el = arr[i];
			console.log(i, el);
		}`,

		// Screwing with test expression

		`for (let i = 0; f(i, arr.length); i++) {
			const el = arr[i];
			console.log(i, el);
		}`,
		`for (let i = 0; i < arr.size; i++) {
			const el = arr[i];
			console.log(i, el);
		}`,
		`for (let i = 0; j < arr.length; i++) {
			const el = arr[i];
			console.log(i, el);
		}`,
		`for (let i = 0; i <= arr.length; i++) {
			const el = arr[i];
			console.log(i, el);
		}`,
		`for (let i = 0; i < arr['length']; i++) {
			const el = arr[i];
			console.log(i, el);
		}`,

		// Screwing with update expression

		`for (let i = 0; arr.length > i;) {
			let el = arr[i];
			console.log(i, el);
		}`,
		`for (let i = 0; arr.length > i; i--) {
			let el = arr[i];
			console.log(i, el);
		}`,
		`for (let i = 0; arr.length > i; f(i)) {
			let el = arr[i];
			console.log(i, el);
		}`,
		`for (let i = 0; arr.length > i; i = f(i)) {
			let el = arr[i];
			console.log(i, el);
		}`,

		// Screwing with the body

		'for (let i = 0; arr.length > i; i ++);',
		'for (let i = 0; arr.length > i; i ++) console.log(NaN)',

		// Screwing with element variable declaration

		`for (let i = 0; i < arr.length; ++i) {
			const el = f(i);
			console.log(i, el);
		}`,
		`for (var j = 0; j < xs.length; j++) {
			var x;
		}`,
		`for (var j = 0; j < xs.length; j++) {
			var {x} = y;
		}`,
		`for (let i = 0; i < arr.length; i++) {
			console.log(i);
		}`,

		// Index is assigned to inside the loop body
		`for (let i = 0; i < input.length; i++) {
			const el = input[i];
			i++;
			console.log(i, el);
		}`,

		`for (let i = 0; i < input.length; i++) {
			const el = input[i];
			i = 4;
			console.log(i, el);
		}`,

		// Using the array other than reading the index
		`for (let i = 0; i < arr.length;i++) {
			console.log(arr[i]);
			arr.reverse();
		}`,

		// Modifying the array element
		`for (let i = 0; i < arr.length; i++) {
			arr[i] = i + 2;
		}`
	],

	invalid: [
		// Use default name
		testCase(`
			for (let i = 0; i < arr.length; i += 1) {
				console.log(arr[i])
			}
		`, `
			for (const element of arr) {
				console.log(element)
			}
		`),

		testCase(`
			for (let i = 0; arr.length > i; i += 1) {
				let el = arr[i];
				console.log(i, el);
			}
		`, `
			for (const [i, el] of arr.entries()) {
				console.log(i, el);
			}
		`),

		testCase(`
			for (let i = 0; i < arr.length; i++) {
				const el = arr[i];
				console.log(i, el);
			}
		`, `
			for (const [i, el] of arr.entries()) {
				console.log(i, el);
			}
		`),

		testCase(`
			for (let i = 0; i < arr.length; ++i) {
				const el = arr[i];
				console.log(i, el);
			}
		`, `
			for (const [i, el] of arr.entries()) {
				console.log(i, el);
			}
		`),

		testCase(`
			for (let i = 0; i < arr.length; i++) {
				const el = arr[i];
				console.log(el);
			}
		`, `
			for (const el of arr) {
				console.log(el);
			}
		`),

		// This tests that the "whole line" removal does not happen when it should not
		testCase(`
			for (var j = 0; j < xs.length; j = j + 1) {
				var x = xs[j];console.log(j, x);
			}
		`, `
			for (const [j, x] of xs.entries()) {
				console.log(j, x);
			}
		`),

		// Index is used outside of the loop, fixer should not apply
		testCase(`
			for (var i = 0; i < arr.length; i++) {
				const el = arr[i];
				console.log(el);
			}
			console.log(i);
		`),

		// Element is used outside of the loop, fixer should not apply
		testCase(`
			for (let i = 0; i < arr.length; i++) {
				var el = arr[i];
				console.log(i, el);
			}
			console.log(el);
		`),

		// Complex element declarations
		testCase(`
			for (var j = 0; j < xs.length; j = j + 1) {
				var x = xs[j], y = ys[j];
				console.log(j, x, y);
			}
		`, `
			for (const [j, x] of xs.entries()) {
				var y = ys[j];
				console.log(j, x, y);
			}
		`),

		testCase(`
			for (var j = 0; j < xs.length; j = j + 1) {
				var y = ys[j], x = xs[j];
				console.log(j, x, y);
			}
		`, `
			for (const [j, x] of xs.entries()) {
				var y = ys[j];
				console.log(j, x, y);
			}
		`),

		testCase(`
			for (var j = 0; j < xs.length; j = j + 1) {
				var y = ys[j], x = xs[j], i = 10;
				console.log(j, x, y);
			}
		`, `
			for (const [j, x] of xs.entries()) {
				var y = ys[j], i = 10;
				console.log(j, x, y);
			}
		`),

		// Complex replacement without index
		testCase(`
			for (var i = 0; i < arr.length; i++) {
				console.log(arr[i]);
				arr[i].doSomething();
				counter += arr[i].total;
				const z = arr[i];
			}
		`, `
			for (const z of arr) {
				console.log(z);
				z.doSomething();
				counter += z.total;
			}
		`),

		// Complex replacement with index
		testCase(`
			for (var i = 0; i < arr.length; i++) {
				console.log(arr[i]);
				arr[i].doSomething();
				counter += arr[i].total;
				const z = arr[i];
				const y = i + 1;
			}
		`, `
			for (const [i, z] of arr.entries()) {
				console.log(z);
				z.doSomething();
				counter += z.total;
				const y = i + 1;
			}
		`)
	]
});
