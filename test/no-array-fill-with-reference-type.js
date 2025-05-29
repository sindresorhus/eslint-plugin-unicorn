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
		'new Array(3).fill(false);     // ✓ boolean (primitive)  ',
		'new Array(3).fill(Symbol(\'foo\'));        // ✓ Symbol(primitive)  ',

		'Array.from({ length: 3 }, () => ({})); // ✓ Safe alternative',
		'Array.from({ length: 3 }, () => { return {} }); // ✓ Safe alternative',
		'Array.from({ length: 3 }, () => (new Map)); // ✓ Safe alternative',
		'Array.from({ length: 3 }, () => { return new Map }); // ✓ Safe alternative',
		'Array.from({ length: 3 }, () => { return new Map() }); // ✓ Safe alternative',

		'Array(3).fill(0);        // ✓ number (primitive)',
		'new Foo(3).fill({});       // ✓ Not Array',
		'Foo(3).fill({});       // ✓ Not Array',
	],
	invalid: [
		'new Array(3).fill({});       // ✗ Object  ',
		'new Array(3).fill(new Map());       // ✗ Map',
		'new Array(3).fill(new Set());       // ✗ Set',
		'new Array(3).fill(/pattern/); // ✗ RegExp ',
		'new Array(3).fill(new String(\'fff\'));       // ✗ new String',

		'new Array(3).fill(new Foo(\'fff\'));       // ✗ new Class',
		'class BarClass {}; new Array(3).fill(BarClass);       // ✗ Class',
		'class BarClass {}; new Array(3).fill(new BarClass());       // ✗ Class instance',
		'new Array(3).fill(() => 1);       // ✗ arrow function',
		'new Array(3).fill(() => {});       // ✗ arrow function',
		'new Array(3).fill(function () {});       // ✗ normal function',
		'const map = new Map(); new Array(3).fill(map);      // ✗ Variable (map)',

		'Array(3).fill({});       // ✗ Object  ',
		// 'const map = new Map(); Array.from({ length: 3 }, () => map); // Array.from is also checked when filled with referenced variable (map)',
	],
});
