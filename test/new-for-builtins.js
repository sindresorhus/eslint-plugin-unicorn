
import outdent from 'outdent';
import {enforceNew, disallowNew, disallowCallOrNew} from '../rules/utils/builtins.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const createShadowedCallTest = object => {
	const [objectName, propertyName] = object.split('.');

	if (!propertyName) {
		return `
			const ${object} = function() {};
			const foo = ${object}();
		`;
	}

	return `
		const ${objectName} = {${propertyName}() {}};
		const foo = ${object}();
	`;
};

const createShadowedNewTest = object => {
	const [objectName, propertyName] = object.split('.');

	if (!propertyName) {
		return `
			const ${object} = function() {};
			const foo = new ${object}();
		`;
	}

	return `
		const ${objectName} = {${propertyName}: class {}};
		const foo = new ${object}();
	`;
};

const createNestedShadowedCallTest = object => {
	const [objectName, propertyName] = object.split('.');

	if (!propertyName) {
		return `
			function outer() {
				const ${object} = function() {};
				function inner() {
					const foo = ${object}();
				}
			}
		`;
	}

	return `
		function outer() {
			const ${objectName} = {${propertyName}() {}};
			function inner() {
				const foo = ${object}();
			}
		}
	`;
};

const createNestedShadowedNewTest = object => {
	const [objectName, propertyName] = object.split('.');

	if (!propertyName) {
		return `
			function insideFunction() {
				const ${object} = function() {};
				function inner() {
					const foo = new ${object}();
				}
			}
		`;
	}

	return `
		function insideFunction() {
			const ${objectName} = {${propertyName}: class {}};
			function inner() {
				const foo = new ${object}();
			}
		}
	`;
};

test.snapshot({
	valid: [
		'const foo = new Object()',
		'const foo = new Array()',
		// Optional call can't become a `new` expression
		'const foo = Array?.()',
		'const foo = Map?.()',
		'const foo = new ArrayBuffer()',
		'const foo = new BigInt64Array()',
		'const foo = new BigUint64Array()',
		'const foo = new DataView()',
		'const foo = new Error()',
		'const foo = new Float16Array()',
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
		'const foo = new AggregateError([])',
		'const foo = new TypeError()',
		'const foo = new SuppressedError(error, suppressed)',
		'const foo = new DisposableStack()',
		'const foo = new AsyncDisposableStack()',
		'const foo = new Intl.DateTimeFormat()',
		'const foo = new Intl.DisplayNames(\'en\', {type: \'language\'})',
		'const foo = new Intl.Locale(\'en\')',
		'const foo = new Intl.Segmenter()',
		'const foo = new Temporal.PlainDate(2024, 1, 1)',
		'const foo = new Temporal.ZonedDateTime(0n, \'UTC\')',
		'const foo = Temporal.Now.instant()',
		'const foo = new WebAssembly.Module(buffer)',
		'const foo = new WebAssembly.Memory({initial: 1})',
		'const foo = new WebAssembly.CompileError()',
		'const foo = WebAssembly.instantiate(buffer)',
		'const foo = WebAssembly.JSTag',
		// Shadowed
		...enforceNew.map(object => createShadowedCallTest(object)),
		...disallowNew.map(object => createShadowedNewTest(object)),
		...disallowCallOrNew.map(object => createShadowedCallTest(object)),
		...disallowCallOrNew.map(object => createShadowedNewTest(object)),
		...enforceNew.map(object => createNestedShadowedCallTest(object)),
		...disallowNew.map(object => createNestedShadowedNewTest(object)),
		...disallowCallOrNew.map(object => createNestedShadowedCallTest(object)),
		...disallowCallOrNew.map(object => createNestedShadowedNewTest(object)),
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
			languageOptions: {globals: {Symbol: 'off'}},
		},
	],
	invalid: [
		'const object = (Object)();',
		// `Object()` is only exempt for strict equality, not loose
		'const isObject = v => Object(v) == v;',
		'const symbol = new (Symbol)("");',
		'const symbol = new /* comment */ Symbol("");',
		'const symbol = new Symbol;',
		// TypeScript non-null assertion wraps the `new` expression
		{code: 'const s = new Symbol()!;', languageOptions: {parser: parsers.typescript}},
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
			languageOptions: {globals: {Array: 'off'}},
		},
		{
			code: outdent`
				const {Array} = globalThis;
				Array();
			`,
			languageOptions: {globals: {Symbol: 'off'}},
		},
		'const foo = Object()',
		'const foo = Array()',
		'const foo = ArrayBuffer()',
		'const foo = BigInt64Array()',
		'const foo = BigUint64Array()',
		'const foo = DataView()',
		'const foo = Error()',
		'const foo = Error(\'Foo bar\')',
		'const foo = AggregateError([])',
		'const foo = EvalError()',
		'const foo = RangeError()',
		'const foo = ReferenceError()',
		'const foo = SuppressedError(error, suppressed)',
		'const foo = SyntaxError()',
		'const foo = TypeError()',
		'const foo = URIError()',
		'const foo = DisposableStack()',
		'const foo = AsyncDisposableStack()',
		'const foo = Float16Array()',
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
		'const foo = Intl.Collator()',
		'const foo = Intl.DateTimeFormat()',
		'const foo = Intl.DisplayNames(\'en\', {type: \'language\'})',
		'const foo = Intl.DurationFormat()',
		'const foo = Intl.ListFormat()',
		'const foo = Intl.Locale(\'en\')',
		'const foo = Intl.NumberFormat()',
		'const foo = Intl.PluralRules()',
		'const foo = Intl.RelativeTimeFormat()',
		'const foo = Intl.Segmenter()',
		'const foo = Temporal.Duration()',
		'const foo = Temporal.Instant(0n)',
		'const foo = Temporal.PlainDate(2024, 1, 1)',
		'const foo = Temporal.PlainDateTime(2024, 1, 1)',
		'const foo = Temporal.PlainMonthDay(1, 1)',
		'const foo = Temporal.PlainTime()',
		'const foo = Temporal.PlainYearMonth(2024, 1)',
		'const foo = Temporal.ZonedDateTime(0n, \'UTC\')',
		'const foo = Temporal.Now()',
		'const foo = new Temporal.Now()',
		'const foo = globalThis.Temporal.Now()',
		'const foo = new globalThis.Temporal.Now()',
		'const foo = WebAssembly()',
		'const foo = new WebAssembly()',
		'const foo = globalThis.WebAssembly()',
		'const foo = new globalThis.WebAssembly()',
		'const foo = WebAssembly.JSTag()',
		'const foo = new WebAssembly.JSTag()',
		'const foo = globalThis.WebAssembly.JSTag()',
		'const foo = new globalThis.WebAssembly.JSTag()',
		'const foo = WebAssembly.Module(buffer)',
		'const foo = WebAssembly.Instance(module, imports)',
		'const foo = WebAssembly.Memory({initial: 1})',
		'const foo = WebAssembly.Table({initial: 1, element: \'anyfunc\'})',
		'const foo = WebAssembly.Global({value: \'i32\', mutable: true}, 0)',
		'const foo = WebAssembly.Tag({parameters: [\'i32\']})',
		'const foo = WebAssembly.Exception(tag, [1])',
		'const foo = WebAssembly.CompileError()',
		'const foo = WebAssembly.LinkError()',
		'const foo = WebAssembly.RuntimeError()',
		'const foo = new BigInt(123)',
		'const foo = new Boolean()',
		'const foo = new Number()',
		'const foo = new Number(\'123\')',
		'const foo = new String()',
		'const foo = new Symbol()',
		outdent`
			function varCheck() {
				{
					var WeakMap = function() {};
				}
				// This should not be reported
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
		outdent`
			function foo() {
				return(globalThis).Map()
			}
		`,
	],
});

// `Date`
test.snapshot({
	valid: [
		'const foo = new Date();',
	],
	invalid: [
		'const foo = Date();',
		'const foo = globalThis.Date();',
		outdent`
			function foo() {
				return(globalThis).Date();
			}
		`,
		'const foo = Date(/*comment*/);',
		'const foo = globalThis/*comment*/.Date();',
		'const foo = Date(bar);',
	],
});
