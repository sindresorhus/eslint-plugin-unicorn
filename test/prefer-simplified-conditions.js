import outdent from 'outdent';
import test from 'ava';
import {Linter} from 'eslint';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {ruleId, rule, test: ruleTester} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

ruleTester.snapshot({
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
		'if ((a && b) || a) {}',
		'if (a || (b && a)) {}',
		'if ((a || b) && a) {}',
		'if (a && (b || a)) {}',
		'if ((object.property && a) || a) {}',
		'const value = (a && b) || a;',
		'function foo(a, b) { const value = (a && b) || a; }',
		'function foo(a) { let b; if ((b && a) || a) {} }',
		'function foo(a) { const b = true; if ((b && a) || a) {} }',
		'class Foo extends Bar { constructor(a) { if ((this && a) || a) {} super(); } }',
		'class Foo extends Bar { constructor(a) { if ((a && this) || a) {} super(); } }',
		'if ((a++ && b) || (a++ && c)) {}',
		'if (((a = value) && b) || ((a = value) && c)) {}',
		'const Array = {isArray() { return true; }}; if ((Array.isArray(value) && a) || (Array.isArray(value) && b)) {}',
		'const Number = {isInteger() { return true; }}; if ((Number.isInteger(value) && a) || (Number.isInteger(value) && b)) {}',
		'if ((Array.isArray(object.property) && a) || (Array.isArray(object.property) && b)) {}',
		'if ((Array.isArray(foo()) && a) || (Array.isArray(foo()) && b)) {}',
		'if ((Number.isInteger(foo()) && a) || (Number.isInteger(foo()) && b)) {}',
		'if ((Array?.isArray(value) && a) || (Array?.isArray(value) && b)) {}',
		'if ((Array.isArray?.(value) && a) || (Array.isArray?.(value) && b)) {}',
		'if ((Number?.isInteger(value) && a) || (Number?.isInteger(value) && b)) {}',
		'if ((Number.isInteger?.(value) && a) || (Number.isInteger?.(value) && b)) {}',
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
		'while (!(!a && b)) {}',
		'!(key === "y" && !isEditable(target))',
		'if (!(key === "y" && !isEditable(target))) {}',
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
		'new (!(a && b))();',
		'(!(a && b))`x`',
		'if (a || (a && b)) {}',
		'if (a || (a && b /* comment */)) {}',
		'if (a && (a || b)) {}',
		'const value = a || (a && b);',
		'function foo(a, b) { return(a || (a && b)); }',
		'function foo(a, b) { throw(a || (a && b)); }',
		'if ((a && true) || a) {}',
		'function foo(a, b) { if ((a && b) || a) {} }',
		'function foo(a, b) { if ((b && a) || a) {} }',
		'function foo(a, b) { if (a || (b && a)) {} }',
		'function foo(a, b) { if ((a || b) && a) {} }',
		'function foo(a, b) { if (a && (b || a)) {} }',
		'function foo(a) { var b; if ((b && a) || a) {} }',
		'if ((a && b) || (a && c)) {}',
		'function foo() { return(a === true && b === true) || (a === true && c === true); }',
		'function foo() { throw(a === true && b === true) || (a === true && c === true); }',
		'if ((a && b /* comment */) || (a && c)) {}',
		'if ((Array.isArray(value) && a) || (Array.isArray(value) && b)) {}',
		'if ((ArrayBuffer.isView(value) && a) || (ArrayBuffer.isView(value) && b)) {}',
		'if ((Error.isError(value) && a) || (Error.isError(value) && b)) {}',
		'if ((Number.isFinite(value) && a) || (Number.isFinite(value) && b)) {}',
		'if ((Number.isInteger(value) && a) || (Number.isInteger(value) && b)) {}',
		'if ((Number.isNaN(value) && a) || (Number.isNaN(value) && b)) {}',
		'if ((Number.isSafeInteger(value) && a) || (Number.isSafeInteger(value) && b)) {}',
		'if ((c || a) && (c || b)) {}',
		'if (((c || a) && (c || b)) && d) {}',
		'Boolean((a && b) || (a && c))',
		'const value = (a === true && b === true) || (a === true && c === true);',
		'const value = (Array.isArray(value) && a === true) || (Array.isArray(value) && b === true);',
		'const value = (Number.isInteger(value) && a === true) || (Number.isInteger(value) && b === true);',
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
		{
			code: 'function foo(a: boolean, b: boolean) { const value = (a && b) || a; }',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		typeAware('declare const flags: {a: boolean; b: boolean; c: boolean}; const a = flags.a; const b = flags.b; const c = flags.c; const value = (a && b) || (a && c);'),
	],
});

test('applies repeated fixes until no nested simplifications remain', t => {
	const linter = new Linter({configType: 'flat'});
	const result = linter.verifyAndFix(
		'!((a && b) || (a && c))',
		{
			plugins: {
				'rule-to-test': {
					rules: {
						[ruleId]: rule,
					},
				},
			},
			rules: {
				[`rule-to-test/${ruleId}`]: 'error',
			},
		},
		{filename: 'test.js'},
	);

	t.true(result.fixed);
	t.is(result.output, '!a || (!b && !c)');
	t.deepEqual(result.messages, []);
});
