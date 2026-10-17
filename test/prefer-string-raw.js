/* eslint-disable no-template-curly-in-string */
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const TEST_STRING = String.raw`a\\b`;

const typescript = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {parser: parsers.typescript},
});

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

const getSuggestionCase = (code, output) => ({
	code,
	errors: [{
		messageId: 'prefer-string-raw',
		suggestions: [{messageId: 'prefer-string-raw/suggestion', output}],
	}],
});

test.typescript({
	valid: [
		`type Path = \`${TEST_STRING}\`;`,
		`enum Paths {File = \`${TEST_STRING}\`}`,
	],
	invalid: [
		getSuggestionCase(
			String.raw`type Separator = 'a\\b' | 'c\\d'; const separator: Separator = 'a\\b';`,
			'type Separator = \'a\\\\b\' | \'c\\\\d\'; const separator: Separator = String.raw`a\\b`;',
		),
		getSuggestionCase(
			String.raw`const options = {path: 'C:\\Users'} as const; const exact: 'C:\\Users' = options.path;`,
			'const options = {path: String.raw`C:\\Users`} as const; const exact: \'C:\\\\Users\' = options.path;',
		),
	],
});

for (const expression of [`'${TEST_STRING}'`, `\`${TEST_STRING}\``]) {
	const replacement = 'String.raw`a\\b`';
	const suggestionPatterns = [
		'const path = VALUE;',
		`const path: '${TEST_STRING}' = VALUE;`,
		`declare function use(path: '${TEST_STRING}'): void; use(VALUE);`,
		'const options = {path: VALUE} as const;',
		'const options = [VALUE] as const;',
		'const options = {nested: {path: VALUE}} as const;',
		'class Paths {readonly path = VALUE;}',
		'const path = VALUE satisfies string;',
		`const path = VALUE satisfies '${TEST_STRING}';`,
		'declare function use<const Type>(value: Type): Type; const path = use(VALUE);',
		`declare function use(value: '${TEST_STRING}'): 1; declare function use(value: string): 2; const result: 1 = use(VALUE);`,
		'const path = (/* keep */ VALUE);',
		'function path(): string {return VALUE;}',
		outdent`
			type Tag<Value> = Value extends string ? 'string' : 'other';
			declare function getTag<Value>(value: Value): Tag<Value>;
			const path: {} | '${TEST_STRING}' = VALUE;
			if (getTag(path) === 'string') {}
		`,
	];

	test({
		valid: suggestionPatterns.map(pattern => typeAware(pattern.replace('VALUE', () => expression))),
		invalid: suggestionPatterns.map(pattern => ({
			...typescript(pattern.replace('VALUE', () => expression)),
			...getSuggestionCase(
				pattern.replace('VALUE', () => expression),
				pattern.replace('VALUE', () => replacement),
			),
		})),
	});

	test({
		valid: [],
		invalid: [typescript, typeAware].flatMap(createTestCase => [
			'const path: string = VALUE;',
			'let path: string = VALUE;',
			'let path = VALUE;',
			'var path = VALUE;',
			'const path: string = (/* keep */ VALUE);',
		].map(pattern => ({
			...createTestCase(pattern.replace('VALUE', () => expression)),
			output: pattern.replace('VALUE', () => replacement),
			errors: [{messageId: 'prefer-string-raw'}],
		}))),
	});

	test({
		valid: [typescript, typeAware].flatMap(createTestCase => [
			`const path = ${expression} as const;`,
			`const path = <const>${expression};`,
		].map(code => createTestCase(code))),
		invalid: [],
	});

	test({
		valid: [],
		invalid: [
			'type PathText = string; const path: PathText = VALUE;',
			'const path: string | undefined = VALUE;',
			'let path: string | null = VALUE;',
			'type PathText = string | undefined; const path: PathText = VALUE;',
		].flatMap(pattern => {
			const code = pattern.replace('VALUE', () => expression);
			const output = pattern.replace('VALUE', () => replacement);
			return [
				{
					...typescript(code),
					...getSuggestionCase(code, output),
				},
				{
					...typeAware(code),
					output,
					errors: [{messageId: 'prefer-string-raw'}],
				},
			];
		}),
	});
}

const returnedTemplate = 'declare const suffix: string; function path(): string {return`a\\\\b${suffix}`;}';
const returnedRawTemplate = 'declare const suffix: string; function path(): string {return String.raw`a\\b${suffix}`;}';
test({
	valid: [],
	invalid: [
		{
			...typescript(returnedTemplate),
			...getSuggestionCase(returnedTemplate, returnedRawTemplate),
		},
		{
			...typeAware(returnedTemplate),
			output: returnedRawTemplate,
			errors: [{messageId: 'prefer-string-raw'}],
		},
	],
});

test({
	valid: [
		typeAware('declare const suffix: string; declare function use<const Type>(value: Type): Type; const result = use({path: `a\\\\b${suffix}`});'),
		typeAware('declare const suffix: string; const path: `a\\\\b${string}` = `a\\\\b${suffix}`;'),
	],
	invalid: [
		...['file.ts', 'file.mts', 'file.cts', 'file.tsx', 'file.js'].map(filename => ({
			filename,
			...getSuggestionCase(`const path = '${TEST_STRING}';`, 'const path = String.raw`a\\b`;'),
			...((filename === 'file.js') && {languageOptions: {parser: parsers.typescript}}),
		})),
		{
			...typeAware('declare const suffix: string; const path = `a\\\\b${suffix}`;'),
			output: 'declare const suffix: string; const path = String.raw`a\\b${suffix}`;',
			errors: [{messageId: 'prefer-string-raw'}],
		},
		{
			...typescript('const path = String.raw`abc`;'),
			output: 'const path = \'abc\';',
			errors: [{messageId: 'unnecessary-string-raw'}],
		},
	],
});

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
		// Mixed `\\` and a real escape sequence: converting to String.raw would change the value
		String.raw`a = "a\\b\tc"`,
		String.raw`a = "a\\b\nc"`,
		String.raw`a = '\\'`,
		String.raw`a = 'a\\b\"'`,
	],
	invalid: [
		`TEST_STRING = '${TEST_STRING}';`,
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

// No unnecessary `String.raw`
test.snapshot({
	valid: [
		'a = foo`ab`',
		'a = foo().bar`ab`',
		'a = foo.bar()`ab`',
		'a = String["raw"]`ab`',
		'a = foo.raw`ab`',
		'a = String.foo`ab`',
		'a = String.raw`a\\b`',
		'a = String.raw`a\\b${foo}cd`',
		'a = String.raw`ab${foo}c\\nd`',
		outdent`
			a = String.raw\`a
				b\\c
				de\`
		`,
		outdent`
			a = String.raw
				// Comment
				\`ab\\c\`
		`,
	],
	invalid: [
		'a = String.raw`abc`',
		'a = String.raw`ab${foo}cd`',
		'a = String.raw`ab"c`',
		'a = String.raw`ab\'c`',
		'a = String.raw`ab\'"c`',
		'a = String.raw`ab\r\nc`',
		outdent`
			a = String.raw\`a
				bc
				de\`
		`,
		outdent`
			a = String.raw\`
			a\${foo}b
			\${bar}cd\`
		`,
		outdent`
			a
			String.raw\`abc\`
		`,
		// ASI
		outdent`
			a
			String.raw\`a\${b}\`
		`,
		outdent`
			a = String.raw
			// Comment
			\`ab
			c\`
		`,
		outdent`
			a = String.raw  /* comment */  \`ab
			c\`
		`,
		outdent`
			function foo() {
				return String.raw\`abc\`
			}
		`,
		outdent`
			function foo() {
				return String.raw
						// comment
						\`abc\`
			}
		`,
		outdent`
			function foo() {
				return (String.raw
						// already parenthesized
						\`abc\`)
			}
		`,
		outdent`
			function foo() {
				return (String.raw) // remove parenthesis
						\`abc\`
			}
		`,
		'String.raw`use strict`', // After fix, this becomes a directive. But that's fine for now.
	],
});

test({
	valid: [
		outdent`
			const String = {raw() {}};
			a = String.raw\`abc\`
		`,
	],
	invalid: [
		{
			// A comment inside the tag is preserved by not fixing
			code: 'String /* keep */ .raw`abc`;',
			errors: [{messageId: 'unnecessary-string-raw'}],
		},
		{
			code: outdent`
				function* foo() {
					yield String.raw
						\`abc\`;
				}
			`,
			output: outdent`
				function* foo() {
					yield (
						'abc');
				}
			`,
			errors: [{messageId: 'unnecessary-string-raw'}],
		},
		{
			code: outdent`
				function* foo() {
					yield String.raw
						\`a\${value}\`;
				}
			`,
			output: outdent`
				function* foo() {
					yield (
						\`a\${value}\`);
				}
			`,
			errors: [{messageId: 'unnecessary-string-raw'}],
		},
	],
});

// Restricted places
const keyTestsComputedIsInvalid = [
	// Object property key
	`({ '${TEST_STRING}': 1 })`,
	// Class members key
	`class C { '${TEST_STRING}' = 1 }`,
	`class C { '${TEST_STRING}'(){} }`,
	`class C { accessor '${TEST_STRING}' = 1 }`,
];
const keyTestsComputedIsValid = [
	// Abstract class members key
	`abstract class C { abstract '${TEST_STRING}' }`,
	`abstract class C { abstract '${TEST_STRING}'() }`,
	`abstract class C { abstract accessor '${TEST_STRING}' }`,
	// Interface members key
	`interface I { '${TEST_STRING}' }`,
	`interface I { '${TEST_STRING}'(): void }`,
];
const toComputed = code => code.replace(`'${TEST_STRING}'`, () => `['${TEST_STRING}']`);
test.snapshot({
	testerOptions: {
		languageOptions: {parser: parsers.typescript},
	},
	valid: [
		// Directive
		`'${TEST_STRING}';`,
		// Module source
		`import '${TEST_STRING}';`,
		`export {} from '${TEST_STRING}';`,
		`export * from '${TEST_STRING}';`,
		// Import attribute key
		`import 'm' with {'${TEST_STRING}': 'v'};`,
		`export {} from 'm' with {'${TEST_STRING}': 'v'};`,
		// Import attribute value
		`import 'm' with {k: '${TEST_STRING}'};`,
		`export {} from 'm' with {k: '${TEST_STRING}'};`,
		// Module specifier
		`import {'${TEST_STRING}' as s} from 'm';`,
		`export {'${TEST_STRING}' as s} from 'm';`,
		`export {s as '${TEST_STRING}'} from 'm';`,
		`export * as '${TEST_STRING}' from 'm';`,

		// JSX attribute value
		{
			code: `<Component attribute='${TEST_STRING}' />`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		// (TypeScript) Enum member key and value
		`enum E {'${TEST_STRING}' = 1}`,
		`enum E {K = '${TEST_STRING}'}`,
		// (TypeScript) Module declaration
		`module '${TEST_STRING}' {}`,
		// (TypeScript) CommonJS module reference
		`import type T = require('${TEST_STRING}');`,
		// (TypeScript) Literal type
		`type T = '${TEST_STRING}';`,
		// (TypeScript) Import type
		`type T = import('${TEST_STRING}');`,
		...keyTestsComputedIsInvalid,
		...keyTestsComputedIsValid.flatMap(code => [code, toComputed(code)]),
		`expect(foo).toMatchInlineSnapshot('${TEST_STRING}')`,
		`expect(foo).toMatchInlineSnapshot(\`${TEST_STRING}\`)`,
	],
	invalid: [
		...keyTestsComputedIsInvalid.map(code => toComputed(code)),
		`expect('${TEST_STRING}').toMatchInlineSnapshot("")`,
		`expect(\`${TEST_STRING}\`).toMatchInlineSnapshot(\`\`)`,
	],
});

// A line break, including a bare `\r`, is not allowed in a string literal, and `\u2028` and `\u2029` are only allowed since ES2019, so these keep the template literal
test({
	valid: [],
	invalid: [
		{
			code: 'a = String.raw`ab\rd`;',
			output: 'a = `ab\rd`;',
			errors: 1,
		},
		{
			code: 'a = String.raw`ab\nd`;',
			output: 'a = `ab\nd`;',
			errors: 1,
		},
		{
			code: 'a = String.raw`ab\u2028d`;',
			output: 'a = `ab\u2028d`;',
			errors: 1,
		},
		{
			code: 'a = String.raw`abc`;',
			output: 'a = \'abc\';',
			errors: 1,
		},
	],
});
