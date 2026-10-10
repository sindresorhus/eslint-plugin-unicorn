import nodeTest from 'node:test';
import vm from 'node:vm';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta, 'prefer-ternary');
const errors = [{messageId: 'prefer-ternary'}];

test({
	valid: [
		'if (test) { call(a); } else { other(b); }',
		'async function unicorn() { if (test) { await a(); } else { await b(); } }',
		'function* unicorn() { if (test) { yield a; } else { yield b; } }',
		'if (test) { throw a; } else { throw b; }',
	],
	invalid: [
		{
			code: 'var let = {}; if (test) { result = let[a]; } else { result = let[b]; }',
			output: 'var let = {}; result = test ? let[a] : let[b];',
			languageOptions: {sourceType: 'script'},
			errors,
		},
		{
			code: 'if (test) { call(a); } else { call(b); }',
			output: 'call(test ? a : b);',
			errors,
		},
		{
			code: 'if (test) { object.method(a); } else { object.method(b); }',
			output: 'object.method(test ? a : b);',
			errors,
		},
		{
			code: 'if (test) { throw new Error("foo"); } else { throw new Error("bar"); }',
			output: 'throw new Error(test ? "foo" : "bar");',
			errors,
		},
		{
			code: 'async function unicorn() { if (test) { await save(a); } else { await save(b); } }',
			output: 'async function unicorn() { await save(test ? a : b); }',
			errors,
		},
		{
			code: 'function* unicorn() { if (test) { yield a + 1; } else { yield b + 1; } }',
			output: 'function* unicorn() { yield (test ? a : b) + 1; }',
			errors,
		},
	],
});

test({
	valid: [
		'if (test) { call(a, b); } else { call(c, d); }',
		'if (test) { call(a); call(b); } else { call(c); }',
		'if (test) { call(a); }',
		'if (test) { object?.method(a); } else { object?.method(b); }',
		'if (test) { object[key](a); } else { object[key](b); }',
		'if (test) { object.nested.method(a); } else { object.nested.method(b); }',
		'if (test) { call(...a); } else { call(...b); }',
		'if (test) { call(a ? b : c); } else { call(d); }',
		'if (a ? b : c) { call(a); } else { call(b); }',
		'if (test) { call([\na,\n]); } else { call([\nb,\n]); }',
		'if (test) { call(() => { return a; }); } else { call(() => { return b; }); }',
		'if (test) { ({a: 1}); } else { ({b: 1}); }',
		'if (test) { [a, ...items]; } else { [b, ...items]; }',
		'if (test) { [a, , 1]; } else { [b, , 1]; }',
		'if (test) { object.a; } else { object.b; }',
		'if (test) { a.method(value); } else { b.method(value); }',
		'function* unicorn() { if (test) { yield* call(a); } else { yield call(b); } }',
		'function* unicorn() { if (test) { yield; } else { yield call(b); } }',
		{
			code: 'if (test) { call(\na,\n); } else { call(b); }',
			options: ['only-single-line'],
		},
		{
			code: 'if (check(\na,\n)) { call(a); } else { call(b); }',
			options: ['only-single-line'],
		},
	],
	invalid: [
		...[
			['if (test) { new Date(a); } else { new Date(b); }', 'new Date(test ? a : b);'],
			['if (test) { a + 1; } else { b + 1; }', '(test ? a : b) + 1;'],
			['if (test) { 1 + a; } else { 1 + b; }', '1 + (test ? a : b);'],
			['if (test) { object[a]; } else { object[b]; }', 'object[test ? a : b];'],
			['if (test) { ({a: 1}); } else { ({a: 2}); }', '({a: test ? 1 : 2});'],
			['if (test) { [1, a]; } else { [1, b]; }', '[1, test ? a : b];'],
			['if (test) { result = call(a); } else { result = call(b); }', 'result = call(test ? a : b);'],
			['if (test) { ({result} = call(a)); } else { ({result} = call(b)); }', '({result} = call(test ? a : b));'],
			['function unicorn() { if (test) { return call(a); } else { return call(b); } }', 'function unicorn() { return call(test ? a : b); }'],
			['function unicorn() { if (test) { return call(a); } return call(b); }', 'function unicorn() { return call(test ? a : b); }'],
			['function unicorn() { if (check()) { return call(a); } return call(b); }', 'function unicorn() { return check() ? call(a) : call(b); }'],
			['if (check()) { result = call(a); } else { result = call(b); }', 'result = check() ? call(a) : call(b);'],
			['async function unicorn() { if (test) { await (a + 1); } else { await (b + 1); } }', 'async function unicorn() { await ((test ? a : b) + 1); }'],
			['function* unicorn() { if (test) { yield* call(a); } else { yield* call(b); } }', 'function* unicorn() { yield* call(test ? a : b); }'],
			['async function* unicorn() { if (test) { yield await call(a); } else { yield await call(b); } }', 'async function* unicorn() { yield await call(test ? a : b); }'],
			['async function unicorn() { if (test) { return await call(a); } else { return await call(b); } }', 'async function unicorn() { return await call(test ? a : b); }'],
			['if (test) { throw {a: 1}; } else { throw {a: 2}; }', 'throw {a: test ? 1 : 2};'],
			['if (ready = check()) { [1, a]; } else { [1, b]; }', '[1, (ready = check()) ? a : b];'],
			['if (check(), ready) { [a]; } else { [b]; }', '[(check(), ready) ? a : b];'],
			['async function unicorn() { if (await check()) { [a]; } else { [b]; } }', 'async function unicorn() { [(await check()) ? a : b]; }'],
			['if (test) { call((a)); } else { call((b)); }', 'call((test ? (a) : (b)));'],
			['if (test) { object[a, b]; } else { object[c, d]; }', 'object[test ? (a, b) : (c, d)];'],
			['if (test) { call(a, shared); } else { call(b, shared); }', 'call(test ? a : b, shared);'],
			['if (test) { call(shared, a); } else { call(shared, b); }', 'call(shared, test ? a : b);'],
			['if (test) { call(a, 1); } else { call (b, 1); }', 'call(test ? a : b, 1);'],
			['if (test) { call(\na,\n); } else { call(b); }', 'call(\ntest ? a : b,\n);'],
			['previous()\nif (test) { [a]; } else { [b]; }', 'previous()\n;[test ? a : b];'],
			['previous()\nif (test) { a + 1; } else { b + 1; }', 'previous()\n;(test ? a : b) + 1;'],
			['previous()\nif (test) { ({a: 1}); } else { ({a: 2}); }', 'previous()\n;({a: test ? 1 : 2});'],
		].map(([code, output]) => ({code, output, errors})),
		...[
			'if (check()) { call(a); } else { call(b); }',
			'if (test) { call(shared(), a); } else { call(shared(), b); }',
			'if (test) { call(/* keep */ a); } else { call(b); }',
			'if (test) { call(a); } else { /* keep */ call(b); }',
			'if (test) { object./* keep */method(a); } else { object.method(b); }',
			'if (check()) { object[a]; } else { object[b]; }',
		].map(code => ({code, errors})),
		{
			code: 'if (test) { call(a); } else { call(b); }',
			output: 'call(test ? a : b);',
			options: ['only-single-line'],
			errors,
		},
		...['  ', '\t'].map(indent => ({
			code: `function unicorn() {\r\n${indent}if (test) {\r\n${indent}${indent}call(\r\n${indent}${indent}${indent}a,\r\n${indent}${indent});\r\n${indent}} else {\r\n${indent}${indent}call(b);\r\n${indent}}\r\n}`,
			output: `function unicorn() {\r\n${indent}call(\r\n${indent}${indent}${indent}test ? a : b,\r\n${indent}${indent});\r\n}`,
			errors,
		})),
	],
});

test({
	valid: [
		{
			code: 'if (test) { object.a(a); } else { object.b(b); }',
			options: ['always', {checkComputedMemberAccess: true}],
		},
	],
	invalid: [
		...[
			['if (test) { a(value); } else { b(value); }', '(test ? a : b)(value);', {checkVaryingBase: true}],
			['if (test) { a.method(value); } else { b.method(value); }', '(test ? a : b).method(value);', {checkVaryingBase: true}],
			['if (test) { a.value; } else { b.value; }', '(test ? a : b).value;', {checkVaryingBase: true}],
			['async function unicorn() { if (test) { await a(); } else { await b(); } }', 'async function unicorn() { await (test ? a : b)(); }', {checkVaryingBase: true}],
			['if (test) { object.a(value); } else { object.b(value); }', 'object[test ? "a" : "b"](value);', {checkComputedMemberAccess: true}],
			['if (test) { object.a; } else { object.b; }', 'object[test ? "a" : "b"];', {checkComputedMemberAccess: true}],
		].map(([code, output, options]) => ({
			code, output, options: ['always', options], errors,
		})),
		{
			code: 'if (test) { a(); } else { b(); }',
			output: '(test ? a : b)();',
			options: ['only-single-line', {checkVaryingBase: true}],
			errors,
		},
	],
});

test({
	valid: [],
	invalid: [
		...[
			['if (test as boolean) { [a]; } else { [b]; }', '[(test as boolean) ? a : b];'],
			['if (test) { call<Result<string>>(a!); } else { call<Result < string >>(b!); }', 'call<Result<string>>(test ? a! : b!);'],
			['if (test satisfies boolean) { [a]; } else { [b]; }', '[test satisfies boolean ? a : b];'],
		].map(([code, output]) => ({
			code, output, errors, languageOptions: {parser: parsers.typescript},
		})),
		{
			code: 'if (test) { call<A>(a); } else { call<B>(b); }',
			errors,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'if (test) { throw {shared, value: 1}; } else { throw {shared, value: 2}; }',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-ternary', suggestions: [{messageId: 'prefer-ternary/suggestion', output: 'throw {shared, value: test ? 1 : 2};'}]}],
		},
		{
			code: 'if (test) { call(<span>{a}</span>); } else { call(<span>{b}</span>); }',
			output: 'call(test ? <span>{a}</span> : <span>{b}</span>);',
			errors,
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
	],
});

for (const [name, code] of [
	['condition and argument order', 'if ((events.push("test"), selected)) { events.push("a"); } else { events.push("b"); }'],
	['binary operand order', 'if ((events.push("test"), selected)) { (events.push("a"), 1) + (events.push("tail"), 2); } else { (events.push("b"), 3) + (events.push("tail"), 2); }'],
	['shared argument order', 'if (selected) { events.push("a", (events.push("tail"), 2)); } else { events.push("b", (events.push("tail"), 2)); }'],
]) {
	for (const selected of [true, false]) {
		nodeTest(`preserves ${name} when selected is ${selected}`, t => {
			const result = new Linter().verifyAndFix(code, {
				plugins: {unicorn},
				rules: {'unicorn/prefer-ternary': 'error'},
			});
			const execute = source => {
				const events = [];
				vm.runInNewContext(source, {events, selected});
				return events;
			};

			t.assert.deepStrictEqual(execute(result.output), execute(code));
			t.assert.strictEqual(result.fixed, name !== 'condition and argument order');
		});
	}
}

for (const selected of [true, false]) {
	nodeTest(`preserves delegated yields when selected is ${selected}`, t => {
		const code = 'function* unicorn() { if (selected) { yield* [1, a]; } else { yield* [1, b]; } return "done"; }';
		const result = new Linter().verifyAndFix(code, {
			plugins: {unicorn},
			rules: {'unicorn/prefer-ternary': 'error'},
		});
		const execute = source => {
			const iterator = vm.runInNewContext(`${source}; unicorn()`, {selected, a: 2, b: 3});
			const results = [];
			let step;
			do {
				step = iterator.next();
				results.push([step.value, step.done]);
			} while (!step.done);

			return results;
		};

		t.assert.strictEqual(result.fixed, true);
		t.assert.deepStrictEqual(execute(result.output), execute(code));
		t.assert.deepStrictEqual(execute(result.output), [[1, false], [selected ? 2 : 3, false], ['done', true]]);
	});
}

const typeAware = testCase => ({
	...testCase,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test({
	valid: [
		typeAware({
			code: 'const enum First { value } const enum Second { value } declare const test: boolean; if (test) { First.value; } else { Second.value; }',
			options: ['always', {checkVaryingBase: true}],
		}),
	],
	invalid: [
		typeAware({
			code: 'declare function call(value: number): void; declare const test: boolean, a: number, b: number; if (test) { call(a); } else { call(b); }',
			output: 'declare function call(value: number): void; declare const test: boolean, a: number, b: number; call(test ? a : b);',
			errors,
		}),
		...[
			'declare function call(value: "a"): void; declare function call(value: "b"): void; declare const test: boolean; if (test) { call("a"); } else { call("b"); }',
			'declare function call<Value>(value: Value): Value; declare const test: boolean; if (test) { call(1); } else { call("b"); }',
			'declare function call(...values: number[]): void; declare const test: boolean; if (test) { call(1); } else { call(2); }',
		].map(code => typeAware({code, errors})),
		typeAware({
			code: 'type Thing = {type: "a"; property: number} | {type: "b"; property: string}; function unicorn(type: Thing["type"]) { if (type === "a") { throw {type, property: 0}; } else { throw {type, property: ""}; } }',
			errors: [{
				messageId: 'prefer-ternary',
				suggestions: [{
					messageId: 'prefer-ternary/suggestion',
					output: 'type Thing = {type: "a"; property: number} | {type: "b"; property: string}; function unicorn(type: Thing["type"]) { throw {type, property: type === "a" ? 0 : ""}; }',
				}],
			}],
		}),
		typeAware({
			code: 'type Thing = {type: "a"; property: number} | {type: "b"; property: string}; function unicorn(type: Thing["type"]): Thing { if (type === "a") { return {type, property: 0}; } else { return {type, property: ""}; } }',
			output: 'type Thing = {type: "a"; property: number} | {type: "b"; property: string}; function unicorn(type: Thing["type"]): Thing { return type === "a" ? {type, property: 0} : {type, property: ""}; }',
			errors,
		}),
		{
			code: 'if (check()) { throw {shared, value: 1}; } else { throw {shared, value: 2}; }',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-ternary', suggestions: []}],
		},
	],
});

nodeTest('honors disable directives for minimal branches', t => {
	const linter = new Linter();
	const result = linter.verifyAndFix('// eslint-disable-next-line unicorn/prefer-ternary\nif (test) { call(a); } else { call(b); }', {
		plugins: {unicorn},
		rules: {'unicorn/prefer-ternary': 'error'},
		linterOptions: {reportUnusedDisableDirectives: 'error'},
	});

	t.assert.strictEqual(result.fixed, false);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(linter.getSuppressedMessages().length, 1);
});
