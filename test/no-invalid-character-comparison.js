import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Single-character comparand
		'str.charAt(4) === "a"',
		'"a" === str.charAt(4)',
		String.raw`str.charAt(4) === "\n"`,
		String.raw`str.charAt(4) !== "\t"`,
		'"abc".at(0) === "a"',
		'"abc"[0] === "a"',

		// Empty string (legitimate out-of-bounds check)
		'str.charAt(100) === ""',
		'str.at(0) === ""',
		'"abc"[100] === ""',

		// Not a method call
		'charAt(4) === "ab"',
		'new charAt(4) === "ab"',

		// Wrong argument count
		'str.charAt(1, 2) === "ab"',

		// Character access on a receiver that is not provably a string
		'str.charAt(0) === "ab"',
		'str.charAt() === "ab"',
		'tokenizer.charAt(0) === "ab"',
		'array.at(0) === "ab"',
		'array[0] === "ab"',
		'foo.at(0) === "ab"',
		'foo[0] === "ab"',

		// Non-computed access or non-index key
		'"abc".length === "ab"',
		'"abc"["length"] === "ab"',
		'String(foo)[index] === "ab"',
		'String(foo)[property] != "12"',
		'String(foo)[i + 1] === "ab"',

		// Dynamic comparand
		'str.charAt(0) === someVariable',

		// Non-equality operator
		'str.charAt(0) < "ab"',
		'str.charAt(0) + "ab"',

		// Optional chaining is intentionally not handled
		'str?.charAt(0) === "ab"',
		'"abc"?.at(0) === "ab"',
	],
	invalid: [
		// All equality operators
		'"abc".charAt(4) === "ab"',
		'"abc".charAt(4) !== "ab"',
		'"abc".charAt(0) == "ab"',
		'"abc".charAt(0) != "ab"',

		// Reversed operand order
		'"ab" === "abc".charAt(4)',

		// Parenthesized operands
		'("abc".charAt(0)) === "ab"',
		'"abc".charAt(0) === ("ab")',

		// Typo motivation (`/n` instead of `\n`)
		'"abc".charAt(3) === "/n"',
		'"abc".charAt(822) !== "foo"',

		// Omitted positions default to `0`
		'"abc".charAt() === "ab"',
		'"abc".at() !== "ab"',

		// Emoji is two UTF-16 code units (OXC misses this)
		'"abc".charAt(0) === "😀"',
		String.raw`"abc".charAt(0) === "\u{1F600}"`,
		String.raw`"abc".charAt(0) === "\r\n"`,

		// Template literal comparand
		'"abc".charAt(0) === `ab`',

		// `charAt` on a provable string receiver
		'String(foo).charAt(0) === "ab"',
		'String.fromCharCode(65).charAt(0) === "ab"',
		'`${foo}`.charAt(0) === "ab"', // eslint-disable-line no-template-curly-in-string
		'(foo + "bar").charAt(0) === "ab"',

		// `at` on a provable string receiver
		'"abc".at(0) === "ab"',
		'"abc".at(0) !== "ab"',
		'"abc".at(-1) === "ab"',
		'String(foo).at(0) === "ab"',
		'String.fromCharCode(65).at(0) === "ab"',
		'`${foo}`.at(0) === "ab"', // eslint-disable-line no-template-curly-in-string
		'(foo + "bar").at(0) === "ab"',

		// `[index]` on a provable string receiver
		'"abc"[0] === "ab"',
		'"abc"[0] != "ab"',
		'"abc"["0"] === "ab"',

		// TypeScript: receiver proven via type annotation
		{
			code: 'declare const s: string;\nconst x = s.at(0) === "ab";',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'declare const s: string;\nconst x = s.charAt(0) === "ab";',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function isAb(s: string) {\n\treturn s["0"] === "ab";\n}',
			languageOptions: {parser: parsers.typescript},
		},
		// TypeScript: receiver proven via `as` assertion
		{
			code: '(foo as string)[0] === "ab";',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
