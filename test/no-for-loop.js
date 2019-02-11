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
		`for (let i = 0; i < arr.length; ++i) {
			const el = f(i);
			console.log(i, el);
		}`,

		// Screwing with the body

		'for (let i = 0; arr.length > i; i ++);',
		'for (let i = 0; arr.length > i; i ++) console.log(NaN)',

		// Screwing with element variable declaration

		`for (var j = 0; j < xs.length; j = j + 1) {
			var x = xs[j], y = ys[j];
			console.log(j, x, y);
		}`,
		`for (var j = 0; j < xs.length; j++) {
			var x;
		}`,
		`for (var j = 0; j < xs.length; j++) {
			var {x} = y;
		}`,
		`for (let i = 0; i < arr.length; i++) {
			console.log(i);
		}`
	],

	invalid: [
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
		`)
	]
});
