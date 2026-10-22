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
		'if ((foo?.() && a) || (foo?.() && b)) {}',
		'if ((object.property && a) || (object?.property && b)) {}',
		'if ((object?.property && a) || (object.property && b)) {}',
		'if ((a && foo?.()) || (a && b)) {}',
		'if ((foo(object?.property) && a) || (foo(object?.property) && b)) {}',
		'if ((object[foo?.()] && a) || (object[foo?.()] && b)) {}',
		'if ((object.property && a) || (object.other && b)) {}',
		'if ((foo(a) && b) || (foo(c) && d)) {}',
		'if ((new Foo() && a) || (new Foo() && b)) {}',
		'if ((a && b++) || (a && c)) {}',
		'if ((a && (b = value)) || (a && c)) {}',
		'const value = (object.property && a) || (object.property && b);',
		'const value = (foo() || a) && (foo() || b);',
		// Complex member objects and computed keys are intentionally unsupported.
		'Boolean((tag`x`.enabled && a) || (tag`x`.enabled && b));',
		'Boolean((object[tag`x`] && a) || (object[tag`x`] && b));',
		'Boolean((a && tag`x`.enabled) || (a && b));',
		'const values = [1].values(); Boolean(([...values].length && false) || ([...values].length && true));',
		'Boolean((object[[...values]] && a) || (object[[...values]] && b));',
		'Boolean(({a: true}.a && false) || ({a: true}.a && true));',
		'if ((class {static enabled = true}.enabled && a) || (class {static enabled = true}.enabled && b)) {}',
		'if ((new Foo().enabled && a) || (new Foo().enabled && b)) {}',
		'if ((object[0] && a) || (object[(key = 0)] && b)) {}',
	],
	invalid: [
		'if ((foo.bar && a) || (foo.bar && b)) {}',
		'if ((foo.bar || a) && (foo.bar || b)) {}',
		'if ((a && object.property) || (a && c)) {}',
		'if ((a || b) && (a || object.property)) {}',
		'if ((object[key] && a) || (object[key] && b)) {}',
		'if ((object.nested.property && a) || (object.nested.property && b)) {}',
		'if ((object.property && a) || (object["property"] && b)) {}',
		'if ((!object.property && a) || (!object.property && b)) {}',
		'if ((object.property === value && a) || (object.property === value && b)) {}',
		'if (((foo).bar && a) || ((foo).bar && b)) {}',
		'if (((foo.bar) && (a)) || ((foo.bar) && (b))) {}',
		'if ((foo.bar /* keep */ && a) || (foo.bar && b)) {}',
		'if ((foo() && a) || (foo() && b)) {}',
		'if ((foo() || a) && (foo() || b)) {}',
		'if ((a && mutateA()) || (a && b)) {}',
		'if ((a || b) && (a || foo())) {}',
		'if ((object.method(value) && a) || (object.method(value) && b)) {}',
		'if ((getObject().property && a) || (getObject().property && b)) {}',
		'if ((object[getKey()] && a) || (object[getKey()] && b)) {}',
		'if ((object[0] && a) || (object[[0].at(0)] && b)) {}',
		'if ((!foo() && a) || (!foo() && b)) {}',
		'if ((foo() !== value && a) || (foo() !== value && b)) {}',
		'if ((foo() /* keep */ && a) || (foo() && b)) {}',
		'if ((a && foo(/* keep */)) || (a && b)) {}',
		'if ((Array.isArray(object.property) && a) || (Array.isArray(object.property) && b)) {}',
		'if ((Array.isArray(foo()) && a) || (Array.isArray(foo()) && b)) {}',
		'if ((Number.isInteger(foo()) && a) || (Number.isInteger(foo()) && b)) {}',
		'const Array = {isArray() { return true; }}; if ((Array.isArray(value) && a) || (Array.isArray(value) && b)) {}',
		'const Number = {isInteger() { return true; }}; if ((Number.isInteger(value) && a) || (Number.isInteger(value) && b)) {}',
		'if ((Array.isArray(value) && foo()) || (Array.isArray(value) && b)) {}',
		'if ((a && Array.isArray(value)) || (a && b)) {}',
		'class Foo extends Bar { method() { if ((super.enabled && a) || (super.enabled && b)) {} } }',
		'class Foo { #enabled; method() { if ((this.#enabled && a) || (this.#enabled && b)) {} } }',
		'if ((Array.isArray([...values]) && a) || (Array.isArray([...values]) && b)) {}',
	],
});

ruleTester.snapshot({
	valid: [],
	invalid: [
		'if (((object.property as boolean) && a) || ((object.property as boolean) && b)) {}',
		'if ((object.property! && a) || (object.property! && b)) {}',
		'if (((object.property satisfies boolean) && a) || ((object.property satisfies boolean) && b)) {}',
		'if (((<boolean>object.property) && a) || ((<boolean>object.property) && b)) {}',
		'if ((foo<boolean>() && a) || (foo<boolean>() && b)) {}',
		'if (((foo() as boolean) && a) || ((foo() as boolean) && b)) {}',
		'declare function foo(): boolean; declare const a: boolean; declare const b: boolean; const value = (foo() && a) || (foo() && b);',
	].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
});

ruleTester.snapshot({
	valid: [],
	invalid: [typeAware('declare const flags: {a: boolean; b: boolean; c: boolean}; const value = (flags.a && flags.b) || (flags.a && flags.c);')],
});

test('autofixes common member reads', t => {
	const linter = new Linter();
	const result = linter.verifyAndFix('if ((foo.bar && a) || (foo.bar && b)) {}', {
		plugins: {unicorn: {rules: {[ruleId]: rule}}},
		rules: {[`unicorn/${ruleId}`]: 'error'},
	});

	t.assert.strictEqual(result.fixed, true);
	t.assert.strictEqual(result.output, 'if (foo.bar && (a || b)) {}');
	t.assert.deepStrictEqual(result.messages, []);
});

test('member factoring preserves boolean results', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {[ruleId]: rule}}},
		rules: {[`unicorn/${ruleId}`]: 'error'},
	};
	const values = [undefined, false, true, 0, 1, '', 'text'];

	for (const expression of [
		'(object.property && a) || (object.property && b)',
		'(object.property || a) && (object.property || b)',
		'(a && object.property) || (a && b)',
	]) {
		const code = `Boolean(${expression})`;
		const {fixed, output, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);

		for (const property of values) {
			for (const a of values) {
				for (const b of values) {
					const context = {object: {property}, a, b};
					t.assert.strictEqual(runInNewContext(output, context), runInNewContext(code, context));
				}
			}
		}
	}
});

for (const [code, expectedOutput] of [
	['if ((foo() && a) || (foo() && b)) {}', 'if (foo() && (a || b)) {}'],
	['(function () {}() === true && false) || (function () {}() === true && true);', '(function () {}() === true && (false || true));'],
	['(async function () {}() === true && false) || (async function () {}() === true && true);', '(async function () {}() === true && (false || true));'],
	['const get = () => ({method() {}}.method() === true && false) || ({method() {}}.method() === true && true);', 'const get = () => ({method() {}}.method() === true && (false || true));'],
	['(class {static get() {}}.get() === true && false) || (class {static get() {}}.get() === true && true);', '(class {static get() {}}.get() === true && (false || true));'],
	['if ((Array.isArray([...values]) && a) || (Array.isArray([...values]) && b)) {}', 'if (Array.isArray([...values]) && (a || b)) {}'],
	['if ((Array.isArray(...values) && a) || (Array.isArray(...values) && b)) {}', 'if (Array.isArray(...values) && (a || b)) {}'],
]) {
	test(`suggests common calls without autofixing: ${code}`, t => {
		const linter = new Linter();
		const result = linter.verifyAndFix(code, {
			plugins: {unicorn: {rules: {[ruleId]: rule}}},
			rules: {[`unicorn/${ruleId}`]: 'error'},
		});

		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
		t.assert.strictEqual(result.messages.length, 1);
		const {suggestions} = result.messages[0];
		t.assert.strictEqual(suggestions.length, 1);
		const {fix} = suggestions[0];
		const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		t.assert.strictEqual(output, expectedOutput);
		t.assert.deepStrictEqual(linter.verify(output, {}), []);
	});
}

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
		['if (!(a === b && c === d)) { foo(); } else { bar(); }', 'if ((a === b && c === d)) { bar(); } else { foo(); }'],
		['const result = !(a && b) ? c : d;', 'const result = a && b ? d : c;'],
		['const result = !(a || b) ? c : d;', 'const result = a || b ? d : c;'],
		['function foo() { if (a && b) { bar(); baz(); qux(); } }', 'function foo() { if (!a || !b) {\n\treturn;\n}\n\nbar(); baz(); qux(); }'],
	]) {
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.strictEqual(output, expectedOutput);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(linter.verifyAndFix(output, config).fixed, false);
	}
});

// Absorption must not turn a value into a reference.
ruleTester({
	valid: ['(object.method || (object.method && other))();'],
	invalid: [
		...[
			'delete (value || (value && other));',
			'(callback || (callback && other))();',
			'(callback || (callback && other))?.();',
			'(tag || (tag && other))`text`;',
			'(eval || (eval && other))("typeof local");',
		].map(code => ({code, errors: [{messageId: 'prefer-simplified-conditions'}]})),
		...[
			'(callback || (callback && other))!();',
			'delete ((value || (value && other)) as unknown);',
		].map(code => ({
			code,
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-simplified-conditions'}],
		})),
		{
			code: 'const result = value || (value && other);',
			output: 'const result = value;',
			errors: [{messageId: 'prefer-simplified-conditions'}],
		},
		{
			code: 'new (Constructor || (Constructor && other))();',
			output: 'new (Constructor)();',
			errors: [{messageId: 'prefer-simplified-conditions'}],
		},
	],
});

test('absorption preserves indirect eval scope', t => {
	const code = 'function check() { const local = 1; return (eval || (eval && other))("typeof local"); } check();';
	const linter = new Linter();
	const result = linter.verifyAndFix(code, {
		plugins: {unicorn: {rules: {[ruleId]: rule}}},
		rules: {[`unicorn/${ruleId}`]: 'error'},
	});

	t.assert.strictEqual(runInNewContext(code), 'undefined');
	t.assert.strictEqual(runInNewContext(result.output), 'undefined');
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
	t.assert.strictEqual(result.messages.length, 1);
});

ruleTester({
	valid: [],
	invalid: [
		['!({} === value && other !== final);', '({} !== value || other === final);'],
		['!(({} === value) && other !== final);', '({} !== value || other === final);'],
		['!((function () {} === value) && other !== final);', '(function () {} !== value || other === final);'],
		['const get = () => !(({} === value) && other !== final);', 'const get = () => ({} !== value || other === final);'],
		['!(function () {} === value && other !== final);', '(function () {} !== value || other === final);'],
		['const get = () => !({} === value && other !== final);', 'const get = () => ({} !== value || other === final);'],
		['const result = !({} === value && other !== final);', 'const result = {} !== value || other === final;'],
		['!(({}) === value && other !== final);', '({}) !== value || other === final;'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

ruleTester.svelte({
	valid: [],
	invalid: [
		['{!(!/x/.test(value) && !/y/.test(value))}', '{(/x/.test(value) || /y/.test(value))}'],
		['{!(!/x/.test(value) || !/y/.test(value))}', '{(/x/.test(value) && /y/.test(value))}'],
		['{(!(!/x/.test(value) && !/y/.test(value)))}', '{(/x/.test(value) || /y/.test(value))}'],
		['{!(!(/x/.test(value)) && !/y/.test(value))}', '{(/x/.test(value)) || /y/.test(value)}'],
		['{/* keep */ !(!/x/.test(value) && !/y/.test(value))}', '{/* keep */ /x/.test(value) || /y/.test(value)}'],
		['<div title={!(!/x/.test(value) && !/y/.test(value))}></div>', '<div title={/x/.test(value) || /y/.test(value)}></div>'],
		['{@html !(!/x/.test(value) && !/y/.test(value))}', '{@html /x/.test(value) || /y/.test(value)}'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	ruleTester({
		testerOptions: {languageOptions},
		valid: [
			'/** @param {?boolean} flag */ function run(flag) { return !(!flag && other); }',
			'/** @param {boolean | string} flag */ function run(flag) { return !(!flag || other); }',
			[
				'/** @param {boolean} first\n * @param {boolean} second\n * @param {unknown} third */',
				'function run(first, second, third) { return (first && second) || (first && third); }',
			].join('\n'),
			[
				'/** @param {boolean} first */ function run(first) {',
				' /** @type {boolean} */ const second = source;',
				' return (second && first) || first;',
				'}',
			].join('\n'),
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [
			[
				'/** @param {boolean} flag */ function run(flag) { return !(!flag && other); }',
				'/** @param {boolean} flag */ function run(flag) { return flag || !other; }',
			],
			[
				'/** @param {boolean} first\n * @param {boolean} second */ function run(first, second) { return !(!first || !second); }',
				'/** @param {boolean} first\n * @param {boolean} second */ function run(first, second) { return first && second; }',
			],
			[
				'/** @param {string} text */ function run(text) { return !(!text.includes("x") && other); }',
				'/** @param {string} text */ function run(text) { return text.includes("x") || !other; }',
			],
			[
				'/** @returns {boolean} */ function read() { return source; } !(!read() || other);',
				'/** @returns {boolean} */ function read() { return source; } read() && !other;',
			],
			[
				'/** @param {boolean} first\n * @param {boolean} second */ function run(first, second) { return (first && second) || first; }',
				'/** @param {boolean} first\n * @param {boolean} second */ function run(first, second) { return first; }',
			],
			[
				[
					'/** @param {boolean} first\n * @param {boolean} second\n * @param {boolean} third */',
					'function run(first, second, third) { return (first && second) || (first && third); }',
				].join('\n'),
				[
					'/** @param {boolean} first\n * @param {boolean} second\n * @param {boolean} third */',
					'function run(first, second, third) { return first && (second || third); }',
				].join('\n'),
			],
			[
				'/** @param {Set<string>} values */ function run(values) { return !(!values.has(key) || other); }',
				'/** @param {Set<string>} values */ function run(values) { return values.has(key) && !other; }',
			],
			[
				'/** @param {string} flag */ function run(/** @type {boolean} */ flag) { return !(!flag && other); }',
				'/** @param {string} flag */ function run(/** @type {boolean} */ flag) { return flag || !other; }',
			],
		].map(([code, output]) => ({
			code, output, filename: 'file.ts', errors: [{messageId: 'prefer-simplified-conditions'}],
		})),
	});

	ruleTester({
		testerOptions: {languageOptions},
		valid: [],
		invalid: [{
			code: [
				'/** @returns {boolean} */ function read() { return source; }',
				'/** @param {boolean} first\n * @param {boolean} second */',
				'function run(first, second) { return (read() && first) || (read() && second); }',
			].join('\n'),
			filename: 'file.ts',
			errors: [{
				messageId: 'prefer-simplified-conditions',
				suggestions: [{
					messageId: 'suggestion',
					output: [
						'/** @returns {boolean} */ function read() { return source; }',
						'/** @param {boolean} first\n * @param {boolean} second */',
						'function run(first, second) { return read() && (first || second); }',
					].join('\n'),
				}],
			}],
		}],
	});
}

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	ruleTester({
		testerOptions: {languageOptions},
		valid: [{code: '/** @param {boolean} flag */ function run(flag) { return !(!(flag as string) && other); }', filename: 'file.ts'}],
		invalid: [],
	});
}

ruleTester.svelte({
	valid: [],
	invalid: [
		{
			code: '{(/x/.test(value) === true && false) || (/x/.test(value) === true && true)}',
			errors: [
				{
					messageId: 'prefer-simplified-conditions',
					suggestions: [
						{
							messageId: 'suggestion',
							output: '{(/x/.test(value) === true && (false || true))}',
						},
					],
				},
			],
		},
	],
});
