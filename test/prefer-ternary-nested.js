import nodeTest from 'node:test';
import vm from 'node:vm';
import outdent from 'outdent';
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
	['function foo() { if (swap() ? a : b) { return object[c ? d : e]; } return object[f]; }', 'function foo() { return (swap() ? a : b) ? object[c ? d : e] : object[f]; }'],
	['run()\nif (a ? b : c) { [foo] = d; } else { [foo] = e; }', 'run()\n;[foo] = (a ? b : c) ? d : e;'],
	['run()\nif (a ? b : c) { foo + 1; } else { bar + 1; }', 'run()\n;((a ? b : c) ? foo : bar) + 1;'],
];

for (const mode of ['always', 'only-single-line']) {
	test({
		valid: [
			'if (a) { b ? c : d; } else { e ? c : d; }',
			'if (a) { call(b ? c : d); } else { call(e); }',
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

const multilineCases = [
	['function foo() { if (a ?\nb : c) { return d; } return e; }', 'function foo() { return (a ?\nb : c) ? d : e; }'],
	['function foo() { if (a) { return b; } return c ?\nd : e; }', 'function foo() { return a ? b : (c ?\nd : e); }'],
].flatMap(([code, output]) => [
	[code, output],
	[code.replaceAll('\n', '\r\n'), output.replaceAll('\n', '\r\n')],
]);

test({
	valid: multilineCases.map(([code]) => ({code, options: ['only-single-line', nestedOptions]})),
	invalid: multilineCases.map(([code, output]) => ({
		code, output, options: ['always', nestedOptions], errors,
	})),
});

nodeTest('nested ternary fixes work with related rules', t => {
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
});

nodeTest('nested ternary fixes preserve side effects and unchosen branch laziness', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn},
		rules: {'unicorn/prefer-ternary': ['error', 'always', nestedOptions]},
	};

	for (const outerCondition of [false, true]) {
		for (const innerCondition of [false, true]) {
			const code = outdent`
				const calls = [];
				function read(name, value) {
					calls.push(name);
					return value;
				}
				let result;
				if (read('outer', ${outerCondition}) ? read('left', ${innerCondition}) : read('right', ${innerCondition})) {
					result = read('nested', ${outerCondition}) ? read('first', 1) : read('second', 2);
				} else {
					result = read('fallback', 3);
				}
				JSON.stringify({result, calls});
			`;
			const result = linter.verifyAndFix(code, config);
			t.assert.strictEqual(result.fixed, true);
			t.assert.deepStrictEqual(result.messages, []);

			const calls = ['outer', outerCondition ? 'left' : 'right'];
			let expectedResult = 3;
			if (innerCondition) {
				calls.push('nested', outerCondition ? 'first' : 'second');
				expectedResult = outerCondition ? 1 : 2;
			} else {
				calls.push('fallback');
			}

			const expected = JSON.stringify({result: expectedResult, calls});
			for (const source of [code, result.output]) {
				t.assert.strictEqual(vm.runInNewContext(source), expected);
			}
		}
	}
});

nodeTest('nested ternary conditions preserve shared receiver evaluation order', t => {
	const code = outdent`
		let object = {selected: 'before', fallback: 'before'};
		function swap() {
			object = {selected: 'after', fallback: 'fallback'};
			return true;
		}
		function run(condition, keyCondition, firstKey, secondKey, fallbackKey) {
			if (swap() ? condition : false) {
				return object[keyCondition ? firstKey : secondKey];
			}
			return object[fallbackKey];
		}
		run(selected, true, 'selected', 'unused', 'fallback');
	`;
	const linter = new Linter();
	const result = linter.verifyAndFix(code, {
		plugins: {unicorn},
		rules: {'unicorn/prefer-ternary': ['error', 'always', nestedOptions]},
	});
	t.assert.strictEqual(result.fixed, true);
	t.assert.deepStrictEqual(result.messages, []);

	for (const selected of [false, true]) {
		for (const source of [code, result.output]) {
			t.assert.strictEqual(vm.runInNewContext(source, {selected}), selected ? 'after' : 'fallback');
		}
	}
});
