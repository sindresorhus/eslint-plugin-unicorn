import {runInNewContext} from 'node:vm';
import test from 'node:test';
import outdent from 'outdent';
import {Linter} from 'eslint';
import plugin from '../index.js';
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
		'!(a && b)',
		'!(a || b)',
		'!(a && b && c)',
		'!(a || b || c)',
		'!(a && (b || c))',
		'!((a && b) || (a && c))',
		'!(a > b)',
		'!(a >= b)',
		'!(a < b)',
		'!(a <= b)',
		'!(min <= x && x <= max)',
		'!(key in object)',
		'!(value instanceof Class)',
		'!((a))',
		'const result = !(!a && b);',
		'foo(!(!function () {} && b));',
		'!(!a && !b)',
		'!(!a && !b && !c)',
		'!(key === "y" && !isEditable(target))',
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
		// Only parameters, function names, and `var` variables are safe to drop
		'function foo(a) { if ((arguments && a) || a) {} }',
		'import b from "b"; function foo(a) { if ((b && a) || a) {} }',
		// TypeScript wrappers around a control flow test are not looked through
		{
			code: 'if (((a && b) || (a && c)) as boolean) {}',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
	invalid: [
		'if (!(!a && !b)) {}',
		'if (!(!a && b)) {}',
		'while (!(!a && b)) {}',
		'if (!(!a && !b && !c)) {}',
		'if (!(x !== undefined && y !== undefined)) {}',
		'if (!(key === "y" && !isEditable(target))) {}',
		'!(key !== "y" || isEditable(target))',
		'!(a == b && c != d)',
		'if (!(!a && b /* comment */)) {}',
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
		'const value = (Error.isError(value) && a === true) || (Error.isError(value) && b === true);',
		'const value = (Number.isInteger(value) && a === true) || (Number.isInteger(value) && b === true);',
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
		'if (!(!(a || b) || !c)) {}',
		'function foo(a, b) { if (a || (!b && a)) {} }',
		'if ((a !== b && c) || (a !== b && d)) {}',
		'foo(!(a !== b && c !== d));',
		'foo[!(a !== b && c !== d)];',
		{
			code: 'const value = !(a !== b && c !== d) as boolean;',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		// Absorption keeps the value, so it does not need a boolean context
		{
			code: 'if ((a || (a && b))!) {}',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		// The opening parenthesis of a non-null assertion does not need a semicolon before the replacement
		{
			code: 'if (((a) || (a && b))!) {}',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
});

ruleTester.snapshot({
	valid: [
		'!a',
		'!!(a && b)',
		'!(a ?? b)',
		'!(a < b)',
		'!((a && b) as boolean)',
		'const value = (a && b) || (a && c);',
	].map(code => ({
		code,
		options: [{negatedConditions: 'expand'}],
		languageOptions: {parser: parsers.typescript},
	})),
	invalid: [
		'if (!(loggedInUser && isWebPage())) {}',
		'!(a && b)',
		'!(a || b)',
		'!(a && b && c)',
		'!(a || b || c)',
		'!(a && (b || c))',
		'!(a || (b && c))',
		'!((a && b) || (a && c))',
		'const value = !(!a && b);',
		'const value = !(!a || b);',
		'if (!(!a && b)) {}',
		'!(a === b && c === d)',
		'!(a == b || c != d)',
		'!(min <= value && value <= max)',
		'!(a?.b && foo?.())',
		'!((a ?? b) && c)',
		'!(a && b) ?? c',
		'c ?? !(a || b)',
		'!(a && (b ? c : d))',
		'!(a && (b = c))',
		'!(a && (b, c))',
		'!(a && (() => b))',
		'function* foo() { return !(a && (yield b)); }',
		'function foo() { return!\n(a && b); }',
		'function foo() { throw!\r\n(a || b); }',
		'function foo() {\r\n  return !(a && b);\r\n}',
		'!(a && b) && c',
		'const value = !(a && b) === c;',
		'async function foo() { await !(a && b); }',
		'(!(a && b)).toString();',
		'!(a && b /* comment */)',
		'!/* comment */(a && b)',
	].map(code => ({code, options: [{negatedConditions: 'expand'}]})),
});

ruleTester.snapshot({
	valid: [],
	invalid: [
		{
			code: 'const element = <div>{!(a && b)}</div>;',
			options: [{negatedConditions: 'expand'}],
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
	],
});

ruleTester.snapshot({
	valid: [],
	invalid: [
		'!(foo! && bar)',
		'!((foo as string) && bar)',
		'!((foo satisfies string) && bar)',
		'!(<string>foo && bar)',
		'const value = (!(a && b)) as boolean;',
	].map(code => ({
		code,
		options: [{negatedConditions: 'expand'}],
		languageOptions: {parser: parsers.typescript},
	})),
});

ruleTester.snapshot({
	valid: [],
	invalid: [
		{
			code: 'declare const a: boolean; const value = !(!a && b);',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('declare const flags: {a: boolean}; const value = !(!flags.a || b);'),
	].map(testCase => ({...testCase, options: [{negatedConditions: 'expand'}]})),
});

ruleTester.snapshot({
	valid: ['!(a && b)', '!(a || b)'].map(code => ({code, options: [{negatedConditions: 'simplify'}]})),
	invalid: [],
});

for (const [options, code, output] of [
	[[], 'if (!(!a && !b && !c)) {}', 'if (a || b || c) {}'],
	[[{negatedConditions: 'expand'}], 'if (!(a && (b || c))) {}', 'if (!a || (!b && !c)) {}'],
	[[{negatedConditions: 'expand'}], 'const a = true;\nfoo()\n!(!(a) && b && c)', 'const a = true;\nfoo()\n;(a) || !b || !c'],
	[[{negatedConditions: 'expand'}], 'foo()\n!(!(a === b) && c && d)', 'foo()\n;(a === b) || !c || !d'],
]) {
	test(`applies repeated fixes until no nested simplifications remain: ${code}`, t => {
		const linter = new Linter({configType: 'flat'});
		const result = linter.verifyAndFix(
			code,
			{
				plugins: {
					'rule-to-test': {
						rules: {
							[ruleId]: rule,
						},
					},
				},
				rules: {
					[`rule-to-test/${ruleId}`]: ['error', ...options],
				},
			},
			{filename: 'test.js'},
		);

		t.assert.strictEqual(result.fixed, true);
		t.assert.strictEqual(result.output, output);
		t.assert.deepStrictEqual(result.messages, []);
	});
}

test('expanded conditions preserve values and evaluation order', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {[ruleId]: rule}}},
		rules: {[`unicorn/${ruleId}`]: ['error', {negatedConditions: 'expand'}]},
	};
	const values = [undefined, false, true, 0, 1, NaN, '', 'text'];

	for (const expression of [
		'!(a() && b())',
		'!(a() || b())',
		'!(!a() && b())',
		'!(!a() || b())',
		'!(a() && !b())',
		'!(a() || !b())',
		'!(a() && (b() || a()))',
		'!(a() || (b() && a()))',
		'!(a() <= b() && b() <= 10)',
	]) {
		const code = `const result = ${expression}; result;`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);

		for (const left of values) {
			for (const right of values) {
				const originalCalls = [];
				const fixedCalls = [];
				const getContext = calls => ({
					a() {
						calls.push('a');
						return left;
					},
					b() {
						calls.push('b');
						return right;
					},
				});

				t.assert.strictEqual(runInNewContext(output, getContext(fixedCalls)), runInNewContext(code, getContext(originalCalls)));
				t.assert.deepStrictEqual(fixedCalls, originalCalls);
			}
		}
	}
});

test('expanded conditions settle with related rules enabled', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: plugin},
		rules: {
			[`unicorn/${ruleId}`]: ['error', {negatedConditions: 'expand'}],
			'unicorn/no-negated-comparison': ['error', {checkLogicalExpressions: true}],
			'unicorn/no-negated-condition': 'error',
			'unicorn/prefer-early-return': 'error',
		},
	};

	for (const [code, expectedOutput] of [
		['if (!(a === b && c === d)) { foo(); } else { bar(); }', 'if ((a !== b || c !== d)) { foo(); } else { bar(); }'],
		['const result = !(a && b) ? c : d;', 'const result = !a || !b ? c : d;'],
		['function foo() { if (a && b) { bar(); baz(); qux(); } }', 'function foo() { if (!a || !b) {\n\treturn;\n}\n\nbar(); baz(); qux(); }'],
	]) {
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.strictEqual(output, expectedOutput);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(linter.verifyAndFix(output, config).fixed, false);
	}
});
