
import outdent from 'outdent';
import {enforceNew, disallowNew} from '../rules/utils/builtins.js';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
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
		'const isObject = v => globalThis.Object(v) === v;',
		'(x) !== Object(x)',

		{
			code: 'new Symbol("")',
			globals: {Symbol: 'off'},
		},
	],
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
		// Trace
		'new globalThis.String()',
		'new global.String()',
		'new self.String()',
		'new window.String()',
		outdent`
			const {String} = globalThis;
			new String();
		`,
		outdent`
			const {String: RenamedString} = globalThis;
			new RenamedString();
		`,
		outdent`
			const RenamedString = globalThis.String;
			new RenamedString();
		`,
		'globalThis.Array()',
		'global.Array()',
		'self.Array()',
		'window.Array()',
		outdent`
			const {Array: RenamedArray} = globalThis;
			RenamedArray();
		`,
		{
			code: 'globalThis.Array()',
			globals: {Array: 'off'},
		},
		{
			code: outdent`
				const {Array} = globalThis;
				Array();
			`,
			globals: {Array: 'off'},
		},
		'const foo = Object()',
		'const foo = Array()',
		'const foo = ArrayBuffer()',
		'const foo = BigInt64Array()',
		'const foo = BigUint64Array()',
		'const foo = DataView()',
		'const foo = Date()',
		'const foo = Error()',
		'const foo = Error(\'Foo bar\')',
		'const foo = Float32Array()',
		'const foo = Float64Array()',
		'const foo = Function()',
		'const foo = Int8Array()',
		'const foo = Int16Array()',
		'const foo = Int32Array()',
		'const foo = (( Map ))()',
		'const foo = Map([[\'foo\', \'bar\'], [\'unicorn\', \'rainbow\']])',
		'const foo = WeakMap()',
		'const foo = Set()',
		'const foo = WeakSet()',
		'const foo = Promise()',
		'const foo = RegExp()',
		'const foo = Uint8Array()',
		'const foo = Uint16Array()',
		'const foo = Uint32Array()',
		'const foo = Uint8ClampedArray()',
		'const foo = new BigInt(123)',
		'const foo = new Boolean()',
		'const foo = new Number()',
		'const foo = new Number(\'123\')',
		'const foo = new String()',
		'const foo = new Symbol()',
		`
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
	],
});
