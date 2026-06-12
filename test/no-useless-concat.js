/* eslint-disable no-template-curly-in-string */
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		`'a' + b`,
		`a + 'b'`,
		'a + b',
		'1 + 2',
		`'a' + 1`,
		`1 + 'a'`,
		`'a' - 'b'`,
		// Different lines, often intentional for readability
		outdent`
			"a" +
				"b"
		`,
		// No two adjacent literals
		`a + 'b' + c`,
		`'a' + b + 'c'`,
		// Tagged template on the left is not a string-ish operand
		'foo`a` + `b`',
		// Not a concatenation
		'`a${b}`',
		`'a'`,
		// TypeScript: assertions are not literals
		{code: `('a' as string) + 'b'`, languageOptions: {parser: parsers.typescript}},
		{code: `('a' as const) + 'b'`, languageOptions: {parser: parsers.typescript}},
		{code: `('a' satisfies string) + 'b'`, languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		`'a' + 'b'`,
		`'1' + '0'`,
		'`a` + `b`',
		'\'1\' + `0`',
		'`1` + \'0\'',
		'"a" + "b"',
		`'' + 'a'`,
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
		`foo + 'a' + 'b'`,
		`'a' + 'b' + 'c'`,
		`'a' + 'b' + c`,
		`foo + 'a' + 'b' + 'c'`,
		// Parentheses
		`('a') + 'b'`,
		`'a' + ('b')`,
		`foo + ('a') + 'b'`,
		// A parenthesized left side in a chain can't be folded without dropping the parenthesis (fix aborts)
		`(foo + 'a') + 'b'`,
		// Folding an expression template across a prior addition would reorder side effects (fix aborts)
		'foo + \'a\' + `${bar()}`',
		'foo + `a` + `b${baz()}`',
		// A statement-leading template replacement needs a semicolon to avoid becoming a tagged template
		outdent`
			foo
			'a' + \`b\${x}\`
		`,
		// Comments are preserved (fix aborts)
		`'a' /* comment */ + 'b'`,
		`'a' + /* comment */ 'b'`,
		// Legacy octal and `\8`/`\9` escapes are valid in sloppy-mode strings but can't move into a template literal (fix aborts)
		{code: '\'\\1\' + `${x}`', languageOptions: {sourceType: 'script'}},
		{code: '`${x}` + \'\\012\'', languageOptions: {sourceType: 'script'}},
		{code: '\'\\8\' + `${x}`', languageOptions: {sourceType: 'script'}},
		// `\0` not followed by a digit is fine in a template literal
		'\'\\0\' + `${x}`',
		// JSX
		{
			code: `const element = <div>{'a' + 'b'}</div>;`,
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		// Keyword spacing
		'function foo() { return `a` + `b${x}` }',
		`function foo() { return 'a' + 'b' }`,
	],
});
