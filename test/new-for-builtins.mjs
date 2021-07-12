
import outdent from 'outdent';
import {enforceNew, disallowNew} from '../rules/utils/builtins.js';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const enforceNewError = builtin => ({
	message: `Use \`new ${builtin}()\` instead of \`${builtin}()\`.`,
});

const disallowNewError = builtin => ({
	message: `Use \`${builtin}()\` instead of \`new ${builtin}()\`.`,
});

test({
	testerOptions: {
		// Make sure globals don't effect shadowed check result
		globals: {
			Map: 'writable',
			Set: 'readonly',
			WeakMap: 'off',
			BigInt: 'writable',
			Boolean: 'readonly',
			Number: 'off',
		},
	},
	valid: [
		'const foo = new Object()',
		'const foo = new Array()',
		'const foo = new ArrayBuffer()',
		'const foo = new BigInt64Array()',
		'const foo = new BigUint64Array()',
		'const foo = new DataView()',
		'const foo = new Date()',
		'const foo = new Error()',
		'const foo = new Float32Array()',
		'const foo = new Float64Array()',
		'const foo = new Function()',
		'const foo = new Int8Array()',
		'const foo = new Int16Array()',
		'const foo = new Int32Array()',
		'const foo = new Map()',
		'const foo = new Map([[\'foo\', \'bar\'], [\'unicorn\', \'rainbow\']])',
		'const foo = new WeakMap()',
		'const foo = new Set()',
		'const foo = new WeakSet()',
		'const foo = new Promise()',
		'const foo = new RegExp()',
		'const foo = new UInt8Array()',
		'const foo = new UInt16Array()',
		'const foo = new UInt32Array()',
		'const foo = new Uint8ClampedArray()',
		'const foo = BigInt()',
		'const foo = Boolean()',
		'const foo = Number()',
		'const foo = String()',
		'const foo = Symbol()',
		// Shadowed
		...enforceNew.map(object => `
			const ${object} = function() {};
			const foo = ${object}();
		`),
		...disallowNew.map(object => `
			const ${object} = function() {};
			const foo = new ${object}();
		`),
		...enforceNew.map(object => `
			function insideFunction() {
				const ${object} = function() {};
				const foo = ${object}();
			}
		`),
		...disallowNew.map(object => `
			function insideFunction() {
				const ${object} = function() {};
				const foo = new ${object}();
			}
		`),
		...enforceNew.map(object => `
			function outer() {
				const ${object} = function() {};
				function inner() {
					const foo = ${object}();
				}
			}
		`),
		...disallowNew.map(object => `
			function insideFunction() {
				const ${object} = function() {};
				function inner() {
					const foo = new ${object}();
				}
			}
		`),
		// #122
		`
			import { Map } from 'immutable';
			const m = Map();
		`,
		`
			const {Map} = require('immutable');
			const foo = Map();
		`,
		`
			const {String} = require('guitar');
			const lowE = new String();
		`,
		`
			import {String} from 'guitar';
			const lowE = new String();
		`,
		// Not builtin
		'new Foo();Bar();',
		'Foo();new Bar();',
		// Ignored
		'const isObject = v => Object(v) === v;',
		'(x) !== Object(x)',
	],
	invalid: [
		{
			code: 'const foo = Object()',
			errors: [enforceNewError('Object')],
			output: 'const foo = new Object()',
		},
		{
			code: 'const foo = Array()',
			errors: [enforceNewError('Array')],
			output: 'const foo = new Array()',
		},
		{
			code: 'const foo = ArrayBuffer()',
			errors: [enforceNewError('ArrayBuffer')],
			output: 'const foo = new ArrayBuffer()',
		},
		{
			code: 'const foo = BigInt64Array()',
			errors: [enforceNewError('BigInt64Array')],
			output: 'const foo = new BigInt64Array()',
		},
		{
			code: 'const foo = BigUint64Array()',
			errors: [enforceNewError('BigUint64Array')],
			output: 'const foo = new BigUint64Array()',
		},
		{
			code: 'const foo = DataView()',
			errors: [enforceNewError('DataView')],
			output: 'const foo = new DataView()',
		},
		{
			code: 'const foo = Date()',
			errors: [enforceNewError('Date')],
			output: 'const foo = new Date()',
		},
		{
			code: 'const foo = Error()',
			errors: [enforceNewError('Error')],
			output: 'const foo = new Error()',
		},
		{
			code: 'const foo = Error(\'Foo bar\')',
			errors: [enforceNewError('Error')],
			output: 'const foo = new Error(\'Foo bar\')',
		},
		{
			code: 'const foo = Float32Array()',
			errors: [enforceNewError('Float32Array')],
			output: 'const foo = new Float32Array()',
		},
		{
			code: 'const foo = Float64Array()',
			errors: [enforceNewError('Float64Array')],
			output: 'const foo = new Float64Array()',
		},
		{
			code: 'const foo = Function()',
			errors: [enforceNewError('Function')],
			output: 'const foo = new Function()',
		},
		{
			code: 'const foo = Int8Array()',
			errors: [enforceNewError('Int8Array')],
			output: 'const foo = new Int8Array()',
		},
		{
			code: 'const foo = Int16Array()',
			errors: [enforceNewError('Int16Array')],
			output: 'const foo = new Int16Array()',
		},
		{
			code: 'const foo = Int32Array()',
			errors: [enforceNewError('Int32Array')],
			output: 'const foo = new Int32Array()',
		},
		{
			code: 'const foo = Map()',
			errors: [enforceNewError('Map')],
			output: 'const foo = new Map()',
		},
		{
			code: 'const foo = Map([[\'foo\', \'bar\'], [\'unicorn\', \'rainbow\']])',
			errors: [enforceNewError('Map')],
			output: 'const foo = new Map([[\'foo\', \'bar\'], [\'unicorn\', \'rainbow\']])',
		},
		{
			code: 'const foo = WeakMap()',
			errors: [enforceNewError('WeakMap')],
			output: 'const foo = new WeakMap()',
		},
		{
			code: 'const foo = Set()',
			errors: [enforceNewError('Set')],
			output: 'const foo = new Set()',
		},
		{
			code: 'const foo = WeakSet()',
			errors: [enforceNewError('WeakSet')],
			output: 'const foo = new WeakSet()',
		},
		{
			code: 'const foo = Promise()',
			errors: [enforceNewError('Promise')],
			output: 'const foo = new Promise()',
		},
		{
			code: 'const foo = RegExp()',
			errors: [enforceNewError('RegExp')],
			output: 'const foo = new RegExp()',
		},
		{
			code: 'const foo = Uint8Array()',
			errors: [enforceNewError('Uint8Array')],
			output: 'const foo = new Uint8Array()',
		},
		{
			code: 'const foo = Uint16Array()',
			errors: [enforceNewError('Uint16Array')],
			output: 'const foo = new Uint16Array()',
		},
		{
			code: 'const foo = Uint32Array()',
			errors: [enforceNewError('Uint32Array')],
			output: 'const foo = new Uint32Array()',
		},
		{
			code: 'const foo = Uint8ClampedArray()',
			errors: [enforceNewError('Uint8ClampedArray')],
			output: 'const foo = new Uint8ClampedArray()',
		},
		{
			code: 'const foo = new BigInt(123)',
			errors: [disallowNewError('BigInt')],
			output: 'const foo = BigInt(123)',
		},
		{
			code: 'const foo = new Boolean()',
			errors: [disallowNewError('Boolean')],
		},
		{
			code: 'const foo = new Number()',
			errors: [disallowNewError('Number')],
		},
		{
			code: 'const foo = new Number(\'123\')',
			errors: [disallowNewError('Number')],
		},
		{
			code: 'const foo = new String()',
			errors: [disallowNewError('String')],
		},
		{
			code: 'const foo = new Symbol()',
			errors: [disallowNewError('Symbol')],
			output: 'const foo = Symbol()',
		},
		{
			code: `
				function varCheck() {
					{
						var WeakMap = function() {};
					}
					// This should not reported
					return WeakMap()
				}
				function constCheck() {
					{
						const Array = function() {};
					}
					return Array()
				}
				function letCheck() {
					{
						let Map = function() {};
					}
					return Map()
				}
			`,
			errors: [enforceNewError('Array'), enforceNewError('Map')],
			output: `
				function varCheck() {
					{
						var WeakMap = function() {};
					}
					// This should not reported
					return WeakMap()
				}
				function constCheck() {
					{
						const Array = function() {};
					}
					return new Array()
				}
				function letCheck() {
					{
						let Map = function() {};
					}
					return new Map()
				}
			`,
		},
	],
});

test.snapshot({
	valid: [],
	invalid: [
		'const object = (Object)();',
		'const symbol = new (Symbol)("");',
		'const symbol = new /* comment */ Symbol("");',
		'const symbol = new Symbol;',
		// `ReturnStatement`
		outdent`
			() => {
				return new // 1
					Symbol();
			}
		`,
		outdent`
			() => {
				return (
					new // 2
						Symbol()
				);
			}
		`,
		outdent`
			() => {
				return new // 3
					(Symbol);
			}
		`,
		outdent`
			() => {
				return new // 4
					Symbol;
			}
		`,
		outdent`
			() => {
				return (
					new // 5
						Symbol
				);
			}
		`,
		outdent`
			() => {
				return (
					new // 6
						(Symbol)
				);
			}
		`,
		outdent`
			() => {
				throw new // 1
					Symbol();
			}
		`,
		outdent`
			() => {
				return new /**/ Symbol;
			}
		`,
	],
});
