import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		'a && b',
		'a || b',
		'!a',
		'!!a',
		'!!(a && b)',
		'!(a > b)',
		'!(a >= b)',
		'!(a < b)',
		'!(a <= b)',
		'!(key in object)',
		'!(value instanceof Class)',
		'!((a))',
		'(a && b) || c',
		'a || (b && c)',
		'(a && b) || (c && d)',
		'if ((a?.b && c) || (a?.b && d)) {}',
		'if ((a && b?.c) || (a && d)) {}',
		'(a && object.property) || (a && c)',
		'(foo() && a) || (foo() && b)',
		'(new Foo() && a) || (new Foo() && b)',
		'(a && b) || (a && b)',
		'if ((a && b) || (a && b)) {}',
		'if ((a || b) && (b || a)) {}',
		'if ((a && b) || (c && a)) {}',
		'if ((b && a) || (a && c)) {}',
		'if ((b && a) || (c && a)) {}',
		'while ((a || c) && (b || c)) {}',
		'if ((c || a) && (b || c)) {}',
		'if ((a || c) && (c || b)) {}',
		'if (((a || c) && (b || c)) && d) {}',
		'const Array = {isArray() { return true; }}; if ((Array.isArray(value) && a) || (Array.isArray(value) && b)) {}',
		'if ((Array.isArray(object.property) && a) || (Array.isArray(object.property) && b)) {}',
		'if ((Array.isArray(foo()) && a) || (Array.isArray(foo()) && b)) {}',
		'const value = (a && b) || (a && c)',
		'const value = (a || c) && (b || c)',
		'const value = (a === true || c === true) && (b === true || c === true);',
		'const value = (a && object.property) || (a && c)',
		'const value = (Array.isArray(value) && a) || (Array.isArray(value) && b)',
		'const value = (a && b /* comment */) || (a && c)',
		{
			code: 'declare const a: boolean; declare const b: boolean; declare const c: boolean; const value = (a || c) && (b || c);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		typeAware('declare const flags: {a: boolean; b: boolean; c: boolean}; const a = flags.a; const b = flags.b; const c = flags.c; const value = (a || c) && (b || c);'),
	],
	invalid: [
		'!(a && b)',
		'!(a || b)',
		'!(a && b && c)',
		'!(a || b || c)',
		'!(a && (b || c))',
		'!((a && b) || (a && c))',
		'const result = !(!a && b);',
		'foo(!(!function () {} && b));',
		'if (!(!a && b)) {}',
		'!(key === "y" && !isEditable(target))',
		'!(key !== "y" || isEditable(target))',
		'!(a == b && c != d)',
		'!(a > b && c)',
		'!(a && b > c)',
		'!(a?.b && c)',
		'!(a && b /* comment */)',
		'!/* comment */(a && b)',
		'foo(!(a && b))',
		outdent`
			foo
			!(a && b)
		`,
		outdent`
			foo
			!(!(a && b) && c)
		`,
		outdent`
			function foo() {
				return!
					(a && b);
			}
		`,
		outdent`
			function foo() {
				throw!
					(a || b);
			}
		`,
		'function foo() { return!(a && b); }',
		'function foo() { throw!(a || b); }',
		'!(a && b) && c',
		'const value = !(a && b) === c;',
		'async function foo() { await !(a && b); }',
		'(!(a && b)).toString();',
		'(!(a && b))();',
		'if ((a && b) || (a && c)) {}',
		'if ((a && b /* comment */) || (a && c)) {}',
		'if ((Array.isArray(value) && a) || (Array.isArray(value) && b)) {}',
		'if ((c || a) && (c || b)) {}',
		'Boolean((a && b) || (a && c))',
		'const value = (a === true && b === true) || (a === true && c === true);',
		'const value = (Array.isArray(value) && a === true) || (Array.isArray(value) && b === true);',
		{
			code: '!(foo! && bar)',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: '!((foo as string) && bar)',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: '!((foo satisfies string) && bar)',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: '!(<string>foo && bar)',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const value = (!(a && b)) as boolean;',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'declare const a: boolean; declare const b: boolean; declare const c: boolean; const value = (a && b) || (a && c);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		typeAware('declare const flags: {a: boolean; b: boolean; c: boolean}; const a = flags.a; const b = flags.b; const c = flags.c; const value = (a && b) || (a && c);'),
	],
});
