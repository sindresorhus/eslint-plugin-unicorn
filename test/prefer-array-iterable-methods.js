import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);
const typescript = code => ({
	code,
	languageOptions: {
		parser: parsers.typescript,
	},
});

test.snapshot({
	valid: [
		// Both index and value are used.
		'for (const [index, value] of [].entries()) {\n\tfoo(index, value);\n}',
		// Index captured by a closure inside the body counts as used.
		'for (const [index, value] of [].entries()) {\n\tsetTimeout(() => foo(index));\n\tbar(value);\n}',
		// Index reassigned inside the body counts as used.
		'for (const [index, value] of [].entries()) {\n\tindex = 0;\n\tfoo(value);\n}',
		// Not an array destructuring.
		'for (const entry of [].entries()) {\n\tfoo(entry);\n}',
		// Unknown receiver, cannot prove it is an array.
		'for (const [, value] of foo.entries()) {\n\tbar(value);\n}',
		// Map receiver: direct iteration would yield `[key, value]`, not the value.
		'for (const [, value] of new Map().entries()) {\n\tbar(value);\n}',
		// `for await`.
		'async () => { for await (const [, value] of [].entries()) {\n\tbar(value);\n} }',
		// `.entries()` with arguments is not `Array#entries()`.
		'for (const [, value] of [].entries(foo)) {\n\tbar(value);\n}',
		// Optional member / optional call.
		'for (const [, value] of foo?.entries()) {\n\tbar(value);\n}',
		'for (const [, value] of [].entries?.()) {\n\tbar(value);\n}',
		// Three-element pattern.
		'for (const [, value, extra] of [].entries()) {\n\tfoo(value, extra);\n}',
		'for (const [, , value] of [].entries()) {\n\tfoo(value);\n}',
		// Computed string-literal member is not `Array#entries()`.
		'for (const [, value] of [][\'entries\']()) {\n\tfoo(value);\n}',
		// Both elements unused.
		'for (const [, ] of [].entries()) {\n\tfoo();\n}',
		// `var` declaration.
		'for (var [, value] of [].entries()) {\n\tfoo(value);\n}',
		// Computed/non-`entries` member.
		'for (const [, value] of [].keys()) {\n\tfoo(value);\n}',
		'for (const [, value] of [][foo]()) {\n\tfoo(value);\n}',
		// Typed array receiver is intentionally not covered.
		'for (const [, value] of new Int8Array().entries()) {\n\tfoo(value);\n}',
		// Unknown receiver via a non-null assertion (no type information).
		typescript('for (const [, value] of foo!.entries()) {\n\tbar(value);\n}'),
		// `satisfies` keeps the receiver's own (unknown) type, so it is not recognized as an array.
		typescript('for (const [, value] of (foo satisfies number[]).entries()) {\n\tbar(value);\n}'),
		// Kept value binding is a rest element (would be a syntax error) or has a default (would change behavior).
		'for (const [, ...rest] of [].entries()) {\n\tfoo(rest);\n}',
		'for (const [, value = 1] of [].entries()) {\n\tfoo(value);\n}',
		// Value unused, but the index is a destructuring pattern, so `.keys()` cannot replace it.
		'for (const [{a}, value] of [].entries()) {\n\tfoo(a);\n}',
		// Index used inside the value element's default or computed key counts as used.
		'for (const [index, {a = index}] of [].entries()) {\n\tfoo(a);\n}',
		'for (const [index, {[index]: a}] of [].entries()) {\n\tfoo(a);\n}',
		'for (const [index, value = index] of [].entries()) {\n\tfoo(value);\n}',
		// Assignment destructuring (not a declaration) is intentionally not covered.
		'for ([, value] of [].entries()) {\n\tfoo(value);\n}',
	],
	invalid: [
		// Index unused → direct iteration.
		'for (const [, value] of [].entries()) {\n\tfoo(value);\n}',
		'for (const [index, value] of [].entries()) {\n\tfoo(value);\n}',
		'for (let [, value] of [].entries()) {\n\tfoo(value);\n}',
		// Nested patterns as the kept value binding.
		'for (const [, {name}] of [].entries()) {\n\tfoo(name);\n}',
		'for (const [, [a, b]] of [].entries()) {\n\tfoo(a, b);\n}',
		// A default *inside* the kept value pattern is fine; only a top-level default on the value binding is unsafe.
		'for (const [, {name = 1}] of [].entries()) {\n\tfoo(name);\n}',
		// Array literal, `Array.from`, `Array.of`, and `new Array` receivers.
		'for (const [, value] of [1, 2, 3].entries()) {\n\tfoo(value);\n}',
		'for (const [, value] of Array.from(foo).entries()) {\n\tbar(value);\n}',
		'for (const [, value] of Array.of(1, 2, 3).entries()) {\n\tfoo(value);\n}',
		'for (const [, value] of new Array(3).entries()) {\n\tfoo(value);\n}',
		'for (const [, value] of Array(3).entries()) {\n\tfoo(value);\n}',
		// Parenthesized receiver.
		'for (const [, value] of ([]).entries()) {\n\tfoo(value);\n}',
		// No-block loop body.
		'for (const [, value] of [].entries()) foo(value);',
		// No space between the keyword and the pattern; the fix must not merge tokens.
		'for(const[index, value] of [].entries()){foo(value)}',
		'for(const[index, value] of [].entries()){foo(index)}',

		// Value unused → `.keys()`.
		'for (const [index] of [].entries()) {\n\tfoo(index);\n}',
		'for (const [index, ] of [].entries()) {\n\tfoo(index);\n}',
		'for (const [index, value] of [].entries()) {\n\tfoo(index);\n}',
		'for (let [index, value] of [].entries()) {\n\tfoo(index);\n}',

		// Comments → report without fix.
		'for (const [/* index */, value] of [].entries()) {\n\tfoo(value);\n}',
		'for (const [, value] of [].entries(/* comment */)) {\n\tfoo(value);\n}',

		// TypeScript array types.
		typescript('function foo(numbers: number[]) {\n\tfor (const [, value] of numbers.entries()) {\n\t\tbar(value);\n\t}\n}'),
		typescript('function foo(numbers: ReadonlyArray<string>) {\n\tfor (const [index] of numbers.entries()) {\n\t\tbar(index);\n\t}\n}'),
		typescript('function foo(numbers: readonly number[]) {\n\tfor (const [, value] of numbers.entries()) {\n\t\tbar(value);\n\t}\n}'),
		// Tuple type annotation is recognized as an array.
		typescript('function foo(pair: [number, string]) {\n\tfor (const [, value] of pair.entries()) {\n\t\tbar(value);\n\t}\n}'),
		// Type assertions on the receiver are recognized even without type information.
		typescript('for (const [, value] of (foo as number[]).entries()) {\n\tbar(value);\n}'),
		typescript('for (const [, value] of (<number[]>foo).entries()) {\n\tbar(value);\n}'),
	],
});
