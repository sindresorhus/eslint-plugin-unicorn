import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const string = " ";',
		'const string = "  ";',
		'const string = "a";',
		'const string = "aaa";',
		'const string = "unicorn unicorn unicorn";',
		String.raw`const string = " \t ";`,
		String.raw`const string = " \n ";`,
		String.raw`const string = "\r\n\r\n\r\n";`,
		'const string = " ".repeat(3);',
		'const string = `  `;',
		'const string = tag`   `;',
		outdent`
			const string = \`  \${value}\`;
		`,
		'const object = {"   ": value};',
		'"   ";',
		'expect(foo).toMatchInlineSnapshot("   ");',
		'expect(foo).toMatchInlineSnapshot(`   `);',
	],
	invalid: [
		'const string = "   ";',
		'const string = "    ";',
		String.raw`const string = "\t\t\t";`,
		String.raw`const string = "\n\n\n";`,
		String.raw`const string = "\r\r\r";`,
		String.raw`const string = "\v\v\v";`,
		String.raw`const string = "\f\f\f";`,
		String.raw`const string = "\u00A0\u00A0\u00A0";`,
		String.raw`const string = "\u2003\u2003\u2003";`,
		String.raw`const string = "\uFEFF\uFEFF\uFEFF";`,
		'const string = `   `;',
		outdent`
			const string = \`\\t\\t\\t\`;
		`,
		'function foo() {return"   "}',
		'foo(); "   ";',
		'const object = {["   "]: value};',
	],
});

test.snapshot({
	valid: [
		{
			code: 'const string = "   "; // minimumRepetitions: 4',
			options: [{minimumRepetitions: 4}],
		},
	],
	invalid: [
		{
			code: 'const string = "  "; // minimumRepetitions: 2',
			options: [{minimumRepetitions: 2}],
		},
		{
			code: 'const string = "    "; // minimumRepetitions: 4',
			options: [{minimumRepetitions: 4}],
		},
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {parser: parsers.typescript},
	},
	valid: [
		'import "   ";',
		'export {} from "   ";',
		'export * from "   ";',
		'import "module" with {"   ": "value"};',
		'export {} from "module" with {"   ": "value"};',
		'import "module" with {key: "   "};',
		'export {} from "module" with {key: "   "};',
		'import {"   " as string} from "module";',
		'export {"   " as string} from "module";',
		'export {string as "   "} from "module";',
		'export * as "   " from "module";',
		'enum Enum {"   " = 1}',
		'enum Enum {Key = "   "}',
		'module "   " {}',
		'import type Type = require("   ");',
		'type Type = "   ";',
		'type Type = `   `;',
		'type Type = import("   ");',
		'type Type = import(`   `);',
		'abstract class Class { abstract "   " }',
		'abstract class Class { abstract "   "() }',
		'abstract class Class { abstract [`   `](): void }',
		'abstract class Class { abstract accessor "   " }',
		'abstract class Class { abstract accessor [`   `]: string }',
		'interface Interface { "   " }',
		'interface Interface { readonly [`   `]: string }',
		'class Class { "   " = 1 }',
		'class Class { "   "() {} }',
		'class Class { accessor "   " = 1 }',
		'enum OtherEnum {Key = `   `}',
	],
	invalid: [
		'class Class { ["   "] = 1 }',
		'class Class { ["   "]() {} }',
		'class Class { accessor ["   "] = 1 }',
	],
});

test.snapshot({
	valid: [
		{
			code: '<Component attribute="   " />',
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
	],
	invalid: [
		{
			code: '<Component attribute={"   "} />',
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: outdent`
				function foo() {
					return'   ';
				}
			`,
			output: outdent`
				function foo() {
					return ' '.repeat(3);
				}
			`,
			errors: [{messageId: 'prefer-string-repeat'}],
		},
	],
});
