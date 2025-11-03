/* eslint-disable no-template-curly-in-string */
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const TEST_STRING = String.raw`a\\b`;

// String literal to `String.raw`
test.snapshot({
	valid: [
		String.raw`a = '\''`,
		outdent`
			a = "\\\\a \\
				b"
		`,
		String.raw`a = 'a\\b\u{51}c'`,
		'a = "a\\\\b`"',
		'a = "a\\\\b${foo}"',
		String.raw`a = '\\'`,
		String.raw`a = 'a\\b\"'`,
	],
	invalid: [
		String.raw`TEST_STRING = '${TEST_STRING}';`,
		String.raw`function a() {return'a\\b'}`,
		String.raw`const foo = "foo \\x46";`,
		String.raw`a = 'a\\b\''`,
		String.raw`a = "a\\b\""`,
	],
});

// `TemplateLiteral` to `String.raw`
test.snapshot({
	valid: [
		// No backslash
		'a = `a`',
		'a = `${foo}`',
		'a = `a${100}b`',

		// Escaped characters other than backslash
		'a = `a\\t${foo.bar}b\\\\c`', // \t
		'a = `${foo}\\\\a${bar}\\``', // \`
		'a = `a\\${`', // \$
		'a = `a$\\{`', // \{
		'a = `${a}\\\'${b}\\\\`', // \'
		'a = `\\"a\\\\b`', // \"

		// Ending with backslash
		'a = `\\\\a${foo}b\\\\${foo}`',

		// Tagged template expression
		'a = String.raw`a\\\\b`',

		// Slash before newline (spread into multiple lines)
		outdent`
			a = \`\\\\a \\
			b\`
		`,
	],
	invalid: [
		'a = `a\\\\b`',
		'function a() {return`a\\\\b${foo}cd`}',
		'a = {[`a\\\\b${foo}cd${foo.bar}e\\\\f`]: b}',
		'a = `a${foo}${foo.bar}b\\\\c`',
		'a = `a\\\\b${"c\\\\d"}e`',
		outdent`
			a = \`\\\\a
			b\`
		`,
		outdent`
			a = \`\\\\a\${foo}
			b\${bar}c
			d\\\\\\\\e\`
		`,
		'a = `a\\\\b${ foo /* bar */}c\\\\d`',
		'a = `a\\\\b${ foo + bar }`',
		'a = `${ foo .bar }a\\\\b`',
	],
});

// Restricted places
const keyTestsComputedIsInvalid = [
	// Object property key
	String.raw`({ '${TEST_STRING}': 1 })`,
	// Class members key
	String.raw`class C { '${TEST_STRING}' = 1 }`,
	String.raw`class C { '${TEST_STRING}'(){} }`,
	String.raw`class C { accessor '${TEST_STRING}' = 1 }`,
];
const keyTestsComputedIsValid = [
	// Abstract class members key
	String.raw`abstract class C { abstract '${TEST_STRING}' }`,
	String.raw`abstract class C { abstract '${TEST_STRING}'() }`,
	String.raw`abstract class C { abstract accessor '${TEST_STRING}' }`,
	// Interface members key
	String.raw`interface I { '${TEST_STRING}' }`,
];
const toComputed = code => code.replace(String.raw`'${TEST_STRING}'`, String.raw`['${TEST_STRING}']`);
test.snapshot({
	testerOptions: {
		languageOptions: {parser: parsers.typescript},
	},
	valid: [
		// Directive
		String.raw`'${TEST_STRING}';`,
		// Module source
		String.raw`import '${TEST_STRING}';`,
		String.raw`export {} from '${TEST_STRING}';`,
		String.raw`export * from '${TEST_STRING}';`,
		// Import attribute key
		String.raw`import 'm' with {'${TEST_STRING}': 'v'};`,
		String.raw`export {} from 'm' with {'${TEST_STRING}': 'v'};`,
		// Import attribute value
		String.raw`import 'm' with {k: '${TEST_STRING}'};`,
		String.raw`export {} from 'm' with {k: '${TEST_STRING}'};`,
		// Module specifier
		String.raw`import {'${TEST_STRING}' as s} from 'm';`,
		String.raw`export {'${TEST_STRING}' as s} from 'm';`,
		String.raw`export {s as '${TEST_STRING}'} from 'm';`,
		String.raw`export * as '${TEST_STRING}' from 'm';`,

		// JSX attribute value
		{
			code: String.raw`<Component attribute='${TEST_STRING}' />`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		// (TypeScript) Enum member key and value
		String.raw`enum E {'${TEST_STRING}' = 1}`,
		String.raw`enum E {K = '${TEST_STRING}'}`,
		// (TypeScript) Module declaration
		String.raw`module '${TEST_STRING}' {}`,
		// (TypeScript) CommonJS module reference
		String.raw`import type T = require('${TEST_STRING}');`,
		// (TypeScript) Literal type
		String.raw`type T = '${TEST_STRING}';`,
		...keyTestsComputedIsInvalid,
		...keyTestsComputedIsValid.flatMap(code => [code, toComputed(code)]),
		`expect(foo).toMatchInlineSnapshot('${TEST_STRING}')`,
	],
	invalid: [
		...keyTestsComputedIsInvalid.map(code => toComputed(code)),
		`expect('${TEST_STRING}').toMatchInlineSnapshot("")`,
	],
});

