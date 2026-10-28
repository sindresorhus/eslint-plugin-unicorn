import nodeTest from 'node:test';
import vm from 'node:vm';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-ternary');
const errors = [{messageId: 'prefer-ternary'}];
const nestedOptions = {checkNestedTernaries: true};

const cases = [
	['function foo() { if (a) { return b; } return c ? d : e; }', 'function foo() { return a ? b : (c ? d : e); }'],
	['function foo() { if (a) { return b ? c : d; } else { return e; } }', 'function foo() { return a ? (b ? c : d) : e; }'],
	['function foo() { if (a) { return b ? c : d; } return e ? f : g; }', 'function foo() { return a ? (b ? c : d) : (e ? f : g); }'],
	['function foo() { if (a) { return b; } return String(c ? d : e); }', 'function foo() { return a ? b : String(c ? d : e); }'],
	['if (a ? b : c) { foo = d; } else { foo = e; }', 'foo = (a ? b : c) ? d : e;'],
	['if (a) { foo = b ? c : d; } else { foo = e; }', 'foo = a ? (b ? c : d) : e;'],
	['if (a) { foo = b; } else { foo = c ? d : e; }', 'foo = a ? b : (c ? d : e);'],
	['if (a) { [foo] = b ? c : d; } else { [foo] = e; }', '[foo] = a ? (b ? c : d) : e;'],
	['if (a) { ({foo} = b); } else { ({foo} = c ? d : e); }', '({foo} = a ? b : (c ? d : e));'],
	['function foo() { if ((a ? b : c)) { return (d ? e : f); } return g; }', 'function foo() { return (a ? b : c) ? (d ? e : f) : g; }'],
	['function foo() { if (a) { return format?.(b ? c : d); } return e; }', 'function foo() { return a ? format?.(b ? c : d) : e; }'],
	['if (a ? b : c) { call(d); } else { call(e); }', 'call((a ? b : c) ? d : e);'],
	['if (a ? b : c) { throw new Error("d"); } else { throw new Error("e"); }', 'throw new Error((a ? b : c) ? "d" : "e");'],
	['function foo() { if (a ? b : c) { return call(d); } return call(e); }', 'function foo() { return call((a ? b : c) ? d : e); }'],
	['if (a) { call(b ? c : d, e); } else { call(b ? c : d, f); }', 'call(b ? c : d, a ? e : f);'],
	['if (a ? b : c) { foo + 1; } else { bar + 1; }', '((a ? b : c) ? foo : bar) + 1;'],
	['if (a) { object[b ? c : d]; } else { object[e]; }', 'object[a ? (b ? c : d) : e];'],
	['if (a) { object[b]; } else { object[c ? d : e]; }', 'object[a ? b : (c ? d : e)];'],
	['function foo() { if (a) { return b; } return c ? d : (e ? f : g); }', 'function foo() { return a ? b : (c ? d : (e ? f : g)); }'],
	['if (a ? b : c) { object.x; } else { object.y; }', 'object[(a ? b : c) ? "x" : "y"];', {checkComputedMemberAccess: true}],
	['if (a ? b : c) { first(value); } else { second(value); }', '((a ? b : c) ? first : second)(value);', {checkVaryingBase: true}],
];

for (const mode of ['always', 'only-single-line']) {
	test({
		valid: [
			'if (a) { b ? c : d; } else { e ? c : d; }',
			'function foo() { if (a) { return; } return b ? c : d; }',
			'function foo() { if (a) { return b ? c : d; } return; }',
			'function foo() { if (a) { return b; } if (c) { return d; } return e ? f : g; }',
			'function foo() { if (a) { return () => { return b ? c : d; }; } return e; }',
			'function foo() { if (a) { return [\nb ? c : d,\n]; } return e; }',
			'let foo = getDefault(); if (a) { foo = b ? c : d; }',
			'let foo = a ? b : c; if (check()) { foo = d; }',
			'let foo = a; if (b) { foo = c ? foo : d; }',
		].map(code => ({code, options: [mode, nestedOptions]})),
		invalid: cases.map(([code, output, options]) => ({
			code, output, options: [mode, {...nestedOptions, ...options}], errors,
		})),
	});
}

test({
	valid: cases.map(([code]) => ({code, options: ['always', {checkNestedTernaries: false}]})),
	invalid: [
		...[
			['let foo = a ? b : c; if (d) { foo = e; }', 'const foo = d ? e : (a ? b : c);'],
			['let foo = a; if (b ? c : d) { foo = e; }', 'const foo = (b ? c : d) ? e : a;'],
			['let foo = a; if (b) { foo = c ? d : e; } foo = f;', 'let foo = b ? (c ? d : e) : a; foo = f;'],
		].map(([code, output]) => ({
			code,
			options: ['always', nestedOptions],
			errors: [{messageId: 'prefer-ternary', suggestions: [{messageId: 'prefer-ternary/suggestion', output}]}],
		})),
		{
			code: 'function foo() { if (a) { return <span>{b ? c : d}</span>; } return e; }',
			output: 'function foo() { return a ? <span>{b ? c : d}</span> : e; }',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
			options: ['always', nestedOptions],
			errors,
		},
		{
			code: 'function foo() { if (a) { return /* keep */ b; } return c ? d : e; }',
			options: ['always', nestedOptions],
			errors: [{messageId: 'prefer-ternary', suggestions: []}],
			output: null,
		},
	],
});

test.typescript({
	valid: [],
	invalid: [
		['function foo() { if (a) { return (b ? c : d) as string; } return e; }', 'function foo() { return a ? ((b ? c : d) as string) : e; }'],
		['function foo() { if (a) { return b; } return (c ? d : e)!; }', 'function foo() { return a ? b : (c ? d : e)!; }'],
		['function foo() { if ((a ? b : c) satisfies boolean) { return d; } return e; }', 'function foo() { return (a ? b : c) satisfies boolean ? d : e; }'],
		['if (a) { foo = <string>(b ? c : d); } else { foo = e; }', 'foo = a ? (<string>(b ? c : d)) : e;'],
	].map(([code, output]) => ({
		code, output, options: ['always', nestedOptions], errors,
	})),
});

nodeTest('nested ternary fixes work with related rules and preserve conditional evaluation', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn},
		rules: {
			'unicorn/prefer-ternary': ['error', 'always', nestedOptions],
			'unicorn/prefer-minimal-ternary': 'error',
			'unicorn/no-nested-ternary': 'error',
		},
	};

	for (const [code] of cases.slice(0, 5)) {
		const result = linter.verifyAndFix(code, config);
		t.assert.strictEqual(result.fixed, true);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(linter.verifyAndFix(result.output, config).fixed, false);
	}

	for (const a of [false, true]) {
		for (const b of [false, true]) {
			const code = `let result; if (${a} ? ${b} : true) { result = 'yes'; } else { result = 'no'; } result;`;
			const result = linter.verifyAndFix(code, config);
			t.assert.strictEqual(result.fixed, true);
			t.assert.deepStrictEqual(result.messages, []);
			t.assert.strictEqual(vm.runInNewContext(result.output), vm.runInNewContext(code));
		}
	}
});
