/* eslint-disable no-template-curly-in-string */
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		String.raw`'a' + b`,
		String.raw`a + 'b'`,
		'a + b',
		'1 + 2',
		String.raw`'a' + 1`,
		String.raw`1 + 'a'`,
		String.raw`'a' - 'b'`,
		// Different lines, often intentional for readability
		outdent`
			"a" +
				"b"
		`,
		// No two adjacent literals
		String.raw`a + 'b' + c`,
		String.raw`'a' + b + 'c'`,
		// Tagged template on the left is not a string-ish operand
		'foo`a` + `b`',
		// Not a concatenation
		'`a${b}`',
		String.raw`'a'`,
		// TypeScript: assertions are not literals
		{code: String.raw`('a' as string) + 'b'`, languageOptions: {parser: parsers.typescript}},
		{code: String.raw`('a' as const) + 'b'`, languageOptions: {parser: parsers.typescript}},
		{code: String.raw`('a' satisfies string) + 'b'`, languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		String.raw`'a' + 'b'`,
		String.raw`'1' + '0'`,
		'`a` + `b`',
		'\'1\' + `0`',
		'`1` + \'0\'',
		'"a" + "b"',
		String.raw`'' + 'a'`,
		// Escaping
		String.raw`'a' + 'b\'c'`,
		// A trailing escape must not merge with the next operand into a new escape sequence
		String.raw`'\\' + 'n'`,
		'\'a\' + \'${b}\'',
		'`a` + `${b}`',
		'"a`b" + "c"',
		// Templates with expressions
		'`a${x}` + `b`',
		'\'a\' + `b${x}`',
		'`a${x}` + `b${y}`',
		'`a` + `b${x}`',
		// Chains
		String.raw`foo + 'a' + 'b'`,
		String.raw`'a' + 'b' + 'c'`,
		String.raw`'a' + 'b' + c`,
		String.raw`foo + 'a' + 'b' + 'c'`,
		// Parentheses
		String.raw`('a') + 'b'`,
		String.raw`'a' + ('b')`,
		String.raw`foo + ('a') + 'b'`,
		// A parenthesized left side in a chain can't be folded without dropping the parenthesis (fix aborts)
		String.raw`(foo + 'a') + 'b'`,
		// Folding an expression template across a prior addition would reorder side effects (fix aborts)
		'foo + \'a\' + `${bar()}`',
		'foo + `a` + `b${baz()}`',
		// A statement-leading template replacement needs a semicolon to avoid becoming a tagged template
		outdent`
			foo
			'a' + \`b\${x}\`
		`,
		// Comments are preserved (fix aborts)
		String.raw`'a' /* comment */ + 'b'`,
		String.raw`'a' + /* comment */ 'b'`,
		// Legacy octal and `\8`/`\9` escapes are valid in sloppy-mode strings but can't move into a template literal (fix aborts)
		{code: '\'\\1\' + `${x}`', languageOptions: {sourceType: 'script'}},
		{code: '`${x}` + \'\\012\'', languageOptions: {sourceType: 'script'}},
		{code: '\'\\8\' + `${x}`', languageOptions: {sourceType: 'script'}},
		// `\0` not followed by a digit is fine in a template literal
		'\'\\0\' + `${x}`',
		// JSX
		{
			code: String.raw`const element = <div>{'a' + 'b'}</div>;`,
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		// Keyword spacing
		'function foo() { return `a` + `b${x}` }',
		String.raw`function foo() { return 'a' + 'b' }`,
	],
});
