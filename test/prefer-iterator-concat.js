import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Not a temporary spread array.
		'new Set(foo)',
		'new Set([...foo])',
		'Iterator.concat(foo, bar)',

		// Mixed arrays are intentionally unsupported.
		'new Set([foo, ...bar])',
		'new Set([...foo, bar])',
		'new Set([, ...foo, ...bar])',

		// Comments inside unrelated arrays are ignored.
		'const values = [/* comment */ ...foo, ...bar]',

		// `prefer-set-methods` handles or intentionally ignores known Set unions.
		'new Set([...iterator.toArray(), ...other])',
		'const a = new Set(); const b = new Set(); new Set([...a, ...b])',
		'const a = new Set(); const b = new Set(); new Set([...(condition ? a : a), ...b])',
		'const a = new Set(); new Set([...a, ...new Set((a.clear(), []))])',
		'[...[...foo, ...bar]]',
		'call(...[...foo, ...bar])',
		'call(value, ...[...foo, ...bar])',
		'new Foo(...[...foo, ...bar])',

		// Non-matching constructors.
		'new Foo([...foo, ...bar])',
		'new foo.Set([...foo, ...bar])',
		'new Map([...foo, ...bar], extra)',
		'new Uint8Array([...foo, ...bar], byteOffset)',

		// Non-matching calls.
		'foo([...bar, ...baz])',
		'Array.of([...foo, ...bar])',
		'Array.from?.([...foo, ...bar])',
		'Array?.from([...foo, ...bar])',
		'Array["from"]([...foo, ...bar])',
		'Object.fromEntries([...foo, ...bar], extra)',
		'Promise.all([...foo, ...bar], extra)',

		// Not direct iterable accepting usage.
		'const values = [...foo, ...bar]',
		'function foo() { return [...foo, ...bar] }',
	],
	invalid: [
		// Constructors that accept iterables.
		'new Set([...foo, ...bar])',
		'new Map([...foo, ...bar])',
		'new WeakSet([...foo, ...bar])',
		'new WeakMap([...foo, ...bar])',
		'new Int8Array([...foo, ...bar])',
		'new Uint8Array([...foo, ...bar])',
		'new Float64Array([...foo, ...bar])',

		// Static methods that accept iterables.
		'Array.from([...foo, ...bar])',
		'Array.from([...foo, ...bar], )',
		'Array.from([...foo, ...bar], mapFunction)',
		'Array.from([...foo, ...bar], mapFunction, thisArgument)',
		'Array.from([...foo, ...bar], mapFunction, thisArgument, extra)',
		'Array.from([...foo, ...throwsOnIteration], mapFunction)',
		'Object.fromEntries([...foo, ...bar])',
		'Uint8Array.from([...foo, ...bar])',
		'Uint8Array.from([...foo, ...bar], mapFunction)',

		// Promise methods are suggestions only.
		'Promise.all([...foo, ...bar])',
		'Promise.allSettled([...foo, ...bar])',
		'Promise.any([...foo, ...bar])',
		'Promise.race([...foo, ...bar])',

		// For-of.
		'for (const value of [...foo, ...bar]);',
		'async () => { for await (const value of [...foo, ...bar]); }',

		// Yield star.
		outdent`
			function * foo() {
				yield * [...bar, ...baz];
			}
		`,

		// Parentheses and formatting.
		'new Set([...(foo ? bar : baz), ...(qux)])',
		'new Set((([...foo, ...bar])))',
		outdent`
			new Set([
				...foo,
				...bar,
			])
		`,

		// Comments are reported without a fix.
		'new Set([/* comment */ ...foo, ...bar])',
		'const a = new Set(); const b = new Set(); new Set([/* comment */ ...a, ...b])',
		'Promise.all([/* comment */ ...foo, ...bar])',
	],
});
