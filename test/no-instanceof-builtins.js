import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		...['===', '!==', '==', '!='].map(operator => ({
			code: `expected ${operator} value instanceof Function;`,
			output: `expected ${operator} (typeof value === 'function');`,
			errors: 1,
		})),
		{
			code: 'value instanceof Function instanceof Object;',
			output: '(typeof value === \'function\') instanceof Object;',
			errors: 1,
		},
		{
			code: 'expected === (value instanceof Function);',
			output: 'expected === (typeof value === \'function\');',
			errors: 1,
		},
		{
			code: 'expected === a + b instanceof Function;',
			output: 'expected === (typeof (a + b) === \'function\');',
			errors: 1,
		},
		...['as boolean', 'satisfies boolean'].map(wrapper => ({
			code: `value instanceof Function ${wrapper};`,
			output: `(typeof value === 'function') ${wrapper};`,
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		})),
		{
			code: 'expected === value instanceof Number;',
			errors: [{
				messageId: 'no-instanceof-builtins',
				suggestions: [{
					messageId: 'switch-to-type-of',
					output: 'expected === (typeof value === \'number\');',
				}],
			}],
		},
		{
			code: 'expected === value /* keep */ instanceof Function;',
			errors: 1,
		},
		...[
			['foo()\nvalue instanceof Function instanceof Object', 'foo()\n;(typeof value === \'function\') instanceof Object'],
			['foo()\nvalue instanceof (Function) instanceof Object', 'foo()\n;(typeof value === \'function\') instanceof Object'],
			['if (ready)\nvalue instanceof Function instanceof Object', 'if (ready)\n(typeof value === \'function\') instanceof Object'],
		].map(([code, output]) => ({code, output, errors: 1})),
		{
			code: 'foo()\nvalue instanceof Number === expected',
			errors: [{
				messageId: 'no-instanceof-builtins',
				suggestions: [{
					messageId: 'switch-to-type-of',
					output: 'foo()\ntypeof value === \'number\' === expected',
				}],
			}],
		},
		{
			code: '<template><div v-if="expected === value instanceof Function"></div></template>',
			output: '<template><div v-if="expected === (typeof value === \'function\')"></div></template>',
			languageOptions: {parser: parsers.vue},
			errors: 1,
		},
		...[
			'foo()\nvalue instanceof Function instanceof Object',
			'() => {foo()\nvalue instanceof Function instanceof Object}',
			'function () {foo()\nvalue instanceof Function instanceof Object}',
		].map(expression => ({
			code: `<template><button @click="${expression}"></button></template>`,
			languageOptions: {parser: parsers.vue},
			errors: 1,
		})),
		{
			code: '<template><button @click="foo()\nvalue instanceof Number === expected"></button></template>',
			languageOptions: {parser: parsers.vue},
			errors: [{
				messageId: 'no-instanceof-builtins', suggestions: [{
					messageId: 'switch-to-type-of',
					output: '<template><button @click="foo()\ntypeof value === \'number\' === expected"></button></template>',
				}],
			}],
		},
		{
			code: '<template><div v-if="expected === value instanceof Number"></div></template>',
			languageOptions: {parser: parsers.vue},
			errors: [{
				messageId: 'no-instanceof-builtins',
				suggestions: [{
					messageId: 'switch-to-type-of',
					output: '<template><div v-if="expected === (typeof value === \'number\')"></div></template>',
				}],
			}],
		},
	],
});

const looseStrategyInvalid = [
	// Primitive types
	'foo instanceof String',
	'foo instanceof Number',
	'foo instanceof Boolean',
	'foo instanceof BigInt',
	'foo instanceof Symbol',
	'foo instanceof Function',
	'foo instanceof Array',
];

const strictStrategyInvalid = [
	// Error types
	'foo instanceof Error',
	'foo instanceof EvalError',
	'foo instanceof RangeError',
	'foo instanceof ReferenceError',
	'foo instanceof SyntaxError',
	'foo instanceof TypeError',
	'foo instanceof URIError',
	'foo instanceof AggregateError',
	'foo instanceof SuppressedError',

	// Collection types
	'foo instanceof Map',
	'foo instanceof Set',
	'foo instanceof WeakMap',
	'foo instanceof WeakRef',
	'foo instanceof WeakSet',

	// Arrays and Typed Arrays
	'foo instanceof ArrayBuffer',
	'foo instanceof Int8Array',
	'foo instanceof Uint8Array',
	'foo instanceof Uint8ClampedArray',
	'foo instanceof Int16Array',
	'foo instanceof Uint16Array',
	'foo instanceof Int32Array',
	'foo instanceof Uint32Array',
	'foo instanceof Float16Array',
	'foo instanceof Float32Array',
	'foo instanceof Float64Array',
	'foo instanceof BigInt64Array',
	'foo instanceof BigUint64Array',

	// Data types
	'foo instanceof Object',

	// Regular Expressions
	'foo instanceof RegExp',

	// Async and functions
	'foo instanceof Promise',
	'foo instanceof Proxy',

	// Other
	'foo instanceof DataView',
	'foo instanceof Date',
	'foo instanceof SharedArrayBuffer',
	'foo instanceof FinalizationRegistry',
];

// Loose strategy
test.snapshot({
	valid: [
		'foo instanceof WebWorker',
		...strictStrategyInvalid,
	].map(code => code.replace('foo', 'fooLoose')),
	invalid: looseStrategyInvalid,
});

// Low-precedence left operand must be parenthesized so `typeof` applies to the whole expression
test.snapshot({
	valid: [],
	invalid: [
		'a + b instanceof Function',
		'a + b instanceof String',
		'a - b instanceof Function',
		'(a + b) instanceof Function',
	],
});

// Strict strategy
test.snapshot({
	valid: [],
	invalid: [...looseStrategyInvalid, ...strictStrategyInvalid].map(code => ({code: code.replace('foo', 'fooStrict'), options: [{strategy: 'strict'}]})),
});

// UseErrorIsError option with loose strategy
test.snapshot({
	valid: [],
	invalid: [
		'fooErr instanceof Error',
		'(fooErr) instanceof (Error)',
	].map(code => ({code, options: [{useErrorIsError: true, strategy: 'loose'}]})),
});

// UseErrorIsError option with strict strategy
test.snapshot({
	valid: [],
	invalid: [
		'err instanceof Error',
		'err instanceof EvalError',
		'err instanceof RangeError',
		'err instanceof ReferenceError',
		'err instanceof SyntaxError',
		'err instanceof TypeError',
		'err instanceof URIError',
		'err instanceof AggregateError',
		'err instanceof SuppressedError',
	].map(code => ({code, options: [{useErrorIsError: true, strategy: 'strict'}]})),
});

test.snapshot({
	valid: [
		// Exclude the specified constructors
		{
			code: 'fooExclude instanceof Function',
			options: [{exclude: ['Function']}],
		},
		{
			code: 'fooExclude instanceof Array',
			options: [{exclude: ['Array']}],
		},
		{
			code: 'fooExclude instanceof String',
			options: [{exclude: ['String']}],
		},
	],
	invalid: [
		// Include the specified constructors
		{
			code: 'fooInclude instanceof WebWorker',
			options: [{include: ['WebWorker']}],
		},
		{
			code: 'fooInclude instanceof HTMLElement',
			options: [{include: ['HTMLElement']}],
		},
	],
});

test.snapshot({
	valid: [
		'foo instanceof globalThis.WebWorker',
		'foo instanceof globalThis["Array"]',
		'const globalThis = {Array}; foo instanceof globalThis.Array',
		'const window = {Array}; foo instanceof window.Array',
		{
			code: 'foo instanceof globalThis.Array',
			options: [{exclude: ['Array']}],
		},
	],
	invalid: [
		'foo instanceof globalThis.String',
		'foo instanceof globalThis /* keep */ .String',
		'foo instanceof globalThis.Function',
		'foo instanceof globalThis /* keep */ .Function',
		'foo instanceof globalThis.Array',
		'const Array = {isArray: () => false}; foo instanceof globalThis.Array',
		'foo instanceof window.Array',
		'foo instanceof self.Array',
		'foo instanceof global.Array',
		{
			code: 'foo instanceof globalThis.Error',
			options: [{useErrorIsError: true}],
		},
		{
			code: 'const Error = CustomError; foo instanceof globalThis.Error',
			options: [{useErrorIsError: true}],
		},
		{
			code: 'foo instanceof globalThis.TypeError',
			options: [{strategy: 'strict'}],
		},
		{
			code: 'foo instanceof globalThis.WebWorker',
			options: [{include: ['WebWorker']}],
		},
	],
});

// Port from no-instanceof-array
test.snapshot({
	valid: [
		'Array.isArray(arr)',
		'arr instanceof array',
		'a instanceof \'array\'',
		'a instanceof ArrayA',
		'a.x[2] instanceof foo()',
		'Array.isArray([1,2,3]) === true',
		'"arr instanceof Array"',
	],
	invalid: [
		// Port from no-instanceof-array
		'arr instanceof Array',
		'[] instanceof Array',
		'[1,2,3] instanceof Array === true',
		'fun.call(1, 2, 3) instanceof Array',
		'obj.arr instanceof Array',
		'foo.bar[2] instanceof Array',
		'(0, array) instanceof Array',
		'function foo(){return[]instanceof Array}',
		outdent`
			(
				// comment
				((
					// comment
					(
						// comment
						foo
						// comment
					)
					// comment
				))
				// comment
			)
			// comment before instanceof\r      instanceof

			// comment after instanceof

			(
				// comment

				(

					// comment

					Array

					// comment
				)

					// comment
			)

				// comment
		`,
		...[
			'<template><div v-if="array instanceof Array" v-for="element of array"></div></template>',
			'<template><div v-if="(( (( array )) instanceof (( Array )) ))" v-for="element of array"></div></template>',
			'<template><div>{{(( (( array )) instanceof (( Array )) )) ? array.join(" | ") : array}}</div></template>',
			'<script>const foo = array instanceof Array</script>',
			'<script>const foo = (( (( array )) instanceof (( Array )) ))</script>',
			'<script>foo instanceof Function</script>',
			'<template><div v-if="foo instanceof Function"></div></template>',
			'<template><div>{{foo instanceof Function}}</div></template>',
		].map(code => ({code, languageOptions: {parser: parsers.vue}})),
	],
});

// A comment on an operand would be relocated by the fix
test({
	valid: [],
	invalid: [
		{
			code: 'if (value /* not an array */ instanceof Array) {}',
			errors: 1,
		},
		{
			code: 'if (value /* callable */ instanceof Function) {}',
			errors: 1,
		},
		{
			code: 'if (value /* not a number */ instanceof Number) {}',
			errors: [{messageId: 'no-instanceof-builtins', suggestions: []}],
		},
		{
			code: 'if (value instanceof /* not an array */ Array) {}',
			errors: 1,
		},
		{
			code: 'if (value instanceof Array) {}',
			output: 'if (Array.isArray(value)) {}',
			errors: 1,
		},
		// A comment outside the expression stays where it is
		{
			code: 'if (/* not empty */ value instanceof Array) {}',
			output: 'if (/* not empty */ Array.isArray(value)) {}',
			errors: 1,
		},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'value instanceof Function | mask;',
			output: 'typeof value === \'function\' | mask;',
			errors: 1,
		},
		{
			code: 'value instanceof Function === expected;',
			output: 'typeof value === \'function\' === expected;',
			errors: 1,
		},
	],
});
