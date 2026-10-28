import path from 'node:path';
import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import ts from 'typescript';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);
const typeScriptFilename = path.resolve('file.ts').replaceAll('\\', '/');

test({
	valid: [],
	invalid: [
		['x === 1 ? a : (x === 2 ? b : (x === 3 ? a : c));', '(x === 1) || (x === 3) ? a : (x === 2 ? b : c);'],
		['x === 1 ? a : (x === 2 ? c : (x === 3 ? b : c));', 'x === 1 ? a : (x === 3 ? b : c);'],
		['x === 1 ? (y ? a : c) : (x === 2 ? b : c);', '(x === 1) && y ? a : (x === 2 ? b : c);'],
		['x === 1 ? (y ? c : a) : (x === 2 ? b : c);', '(x === 1) && !y ? a : (x === 2 ? b : c);'],
		['previous\nx === 1 ? a : (x === 2 ? b : (x === 3 ? a : c));', 'previous\n;(x === 1) || (x === 3) ? a : (x === 2 ? b : c);'],
		['if (condition) x === 1 ? a : (x === 2 ? b : (x === 3 ? a : c));', 'if (condition) (x === 1) || (x === 3) ? a : (x === 2 ? b : c);'],
		['for (; condition; update()) x === 1 ? a : (x === 2 ? b : (x === 3 ? a : c));', 'for (; condition; update()) (x === 1) || (x === 3) ? a : (x === 2 ? b : c);'],
		['a ? (b ? d : c) : d;', 'a && !b ? c : d;'],
		['a ? c : (b ? d : c);', 'a || !b ? c : d;'],
		['x === 1 ? a : (enabled && x === 2 ? b : (x === 3 ? a : c));', '(x === 1) || (x === 3) ? a : (enabled && x === 2 ? b : c);'],
		['x === 1 ? a : (x === 2 ? b : (enabled && /* keep */ x === 3 ? a : c));', '(x === 1) || (enabled && /* keep */ x === 3) ? a : (x === 2 ? b : c);'],
		['enabled && x === 1 ? c : (x === 2 ? a : (x === 3 ? b : c));', 'x === 2 ? a : (x === 3 ? b : c);'],
		['enabled && x === 1 ? (y ? a : c) : (x === 2 ? b : c);', 'enabled && x === 1 && y ? a : (x === 2 ? b : c);'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test.snapshot({
	valid: [
		'x === 1 ? a : (x > 0 ? b : (x === 3 ? a : c));',
		'x === 1 ? a : (x === 3 ? b : (x === 3 ? a : c));',
		'x === 1 ? a : (x === 2 || x === 3 ? b : (x === 3 || x === 4 ? a : c));',
		'x === 1 ? a : (x === 2 || y === 2 ? b : (x === 3 ? a : c));',
		'x === 1 ? a : (x === 2 && (x = 3, false) ? b : (x === 3 ? a : c));',
		'x === 1 ? a : (x === 2 ? b : (x === 3 && (x = 2, false) ? a : c));',
		'x === 1 ? ((x = 2, false) ? a : c) : (x === 2 ? b : c);',
		'x === 1 ? (check() ? a : c) : (x === 2 ? b : c);',
		'x === 1 ? a : (x === 0 ? b : (x === -0 ? a : c));',
		'x == 1 ? a : (x == 2 ? b : (x == 3 ? a : c));',
		'getValue() === 1 ? a : (getValue() === 2 ? b : (getValue() === 3 ? a : c));',
		'object[key] === 1 ? a : (object[key] === 2 ? b : (object[key] === 3 ? a : c));',
		'object?.kind === 1 ? a : (object?.kind === 2 ? b : (object?.kind === 3 ? a : c));',
		'class Example { #kind; method() { return this.#kind === 1 ? a : (this.kind === 2 ? b : (this.#kind === 3 ? a : c)); } }',
		'x === /a/ ? a : (x === /b/ ? b : (x === /a/ ? a : c));',
		'const first = async value => value.kind === 1; const second = async value => value.kind === 2; first(x) ? (y ? a : c) : (second(x) ? b : c);',
		'let first = value => value.kind === 1; const second = value => value.kind === 2; first = other; first(x) ? (y ? a : c) : (second(x) ? b : c);',
		'const first = value => (change(), value.kind === 1); const second = value => value.kind === 2; first(x) ? (y ? a : c) : (second(x) ? b : c);',
		'const first = (value = fallback) => value.kind === 1; const second = value => value.kind === 2; first(x) ? (y ? a : c) : (second(x) ? b : c);',
		'const first = value => value.kind === 1; const second = value => value.kind === 2; first(x) ? (y ? a : c) : (second(other) ? b : c);',
		'const first = value => value.kind === 1; const second = value => value.other === 2; first(x) ? (y ? a : c) : (second(x) ? b : c);',
		'const first = value => object.kind === 1; const second = value => object.kind === 2; first(x) ? (y ? a : c) : (second(x) ? b : c);',
		'const first = function* (value) { return value.kind === 1; }; const second = value => value.kind === 2; first(x) ? (y ? a : c) : (second(x) ? b : c);',
		'const first = value => value.kind === 1; const second = value => value.kind === 2; first(...values) ? (y ? a : c) : (second(x) ? b : c);',
		'const first = value => value.kind === 1; const second = value => value.kind === 2; first?.(x) ? (y ? a : c) : (second(x) ? b : c);',
		'const first = value => value.kind === 1; const second = value => value.kind === 2; first(read()) ? (y ? a : c) : (second(read()) ? b : c);',
		'function first(value) { return value.kind === 1; } const second = value => value.kind === 2; first = other; first(x) ? (y ? a : c) : (second(x) ? b : c);',
		'const first = value => { value.kind = 1; return value.kind === 1; }; const second = value => value.kind === 2; first(x) ? (y ? a : c) : (second(x) ? b : c);',
		'const {third} = value => value === 3; x === 1 ? a : (x === 2 ? b : (third(x) ? a : c));',
		'x === 1 ? a : (mutate() && x === 2 ? b : (x === 3 ? a : c));',
		'x === 1 ? a : ((x = 3) && x === 2 ? b : (x === 3 ? a : c));',
		'x === 1 ? a : (enabled && (x === 2 || y === 2) ? b : (x === 3 ? a : c));',
		'const first = value => mutate() && value.kind === 1; const second = value => value.kind === 2; first(x) ? (y ? a : c) : (second(x) ? b : c);',
		'x === 1 ? a : (x === 2 && mutate`value` ? b : (x === 3 ? a : c));',
		'x === 1 ? a : (mutate`value` && x === 2 ? b : (x === 3 ? a : c));',
		'x === 1 ? (mutate`value` ? a : c) : (x === 2 ? b : c);',
		'const first = value => value.kind === 1 && mutate`value`; const second = value => value.kind === 2; first(x) ? (y ? a : c) : (second(x) ? b : c);',
		'x === 1 ? a : (x === 2 && [...values].length ? b : (x === 3 ? a : c));',
		'x === 1 ? ([...values].length ? a : c) : (x === 2 ? b : c);',
		'const first = value => value.kind === 1 && [...values].length; const second = value => value.kind === 2; first(x) ? (y ? a : c) : (second(x) ? b : c);',
	],
	invalid: [
		'x === 1 ? a : (x === 2 ? b : (x === 3 ? d : (x === 4 ? a : c)));',
		'x === 1 || x === 4 ? a : (x === 2 ? b : (x === 3 || x === 5 ? a : c));',
		'x === 1 ? a : (x === 2 && enabled ? b : (x === 3 ? a : c));',
		'1 === x ? a : (2 === x ? b : (3 === x ? a : c));',
		'object.kind === "a" ? a : (object.kind === "b" ? b : (object.kind === "c" ? a : c));',
		'object["kind"] === "a" ? a : (object["kind"] === "b" ? b : (object["kind"] === "c" ? a : c));',
		'this.kind === 1 ? a : (this.kind === 2 ? b : (this.kind === 3 ? a : c));',
		'typeof x === "string" ? a : (typeof x === "number" ? b : (typeof x === "boolean" ? a : c));',
		'x === -1 ? a : (x === 0 ? b : (x === +1 ? a : c));',
		'x === 1n ? a : (x === 2n ? b : (x === 3n ? a : c));',
		'x === null ? a : (x === false ? b : (x === true ? a : c));',
		'x === `a` ? a : (x === "b" ? b : (x === `c` ? a : c));',
		'x === 1 ? a(/* keep */) : (x === 2 ? b(/* keep */) : (x === 3 ? a(/* keep */) : c));',
		'x === 1 ? a : (x === 2 /* keep */ ? b : (x === 3 ? a : c));',
		'x === 1 ? a : (x === 2 ? b : (x === 3 ? a : (x === 4 ? a : c)));',
		'x === 1 ? (y ?? z ? c : a) : (x === 2 ? b : c);',
		'x === 1 ? ((y, z) ? c : a) : (x === 2 ? b : c);',
		'x === 1 ? a : (x === 2 ? b : (x === 3 /* keep */ ? a : c));',
		'x === 1 ? a : (x === 2 ? c /* keep */ : (x === 3 ? b : c));',
		'previous\nx === 1 ? c : (x === 2 ? b : c);',
		'const value = x === 1\r\n  ? a\r\n  : (x === 2\r\n    ? b\r\n    : (x === 3 ? a : c));',
		'const first = value => value.kind === 1; const second = value => value.kind === 2; first(x) ? (y ? a : c) : (second(x) ? b : c);',
		'const first = function (value) { return value.kind === 1; }; const second = value => value.kind === 2; first(x) ? (y ? c : a) : (second(x) ? b : c);',
		'const first = value => typeof value === "string"; const second = value => typeof value === "number"; first(x) ? (y ? a : c) : (second(x) ? b : c);',
		'function first(value) { return value.kind === 1; } function second(input) { return input.kind === 2; } first(object.value) ? (y ? a : c) : (second(object.value) ? b : c);',
		'/** @type {number} */ let x; x === 1 ? a : (x === 2 ? b : (x === 3 ? a : c));',
		'x === 1 ? a : (enabled && (x === 2 || x === 4) ? b : (x === 3 ? a : c));',
		'const first = value => enabled && value.kind === 1; const second = value => value.kind === 2; first(x) ? (y ? a : c) : (second(x) ? b : c);',
	],
});

function getTypeScriptProgram(code, overrides = {}) {
	const filename = typeScriptFilename;
	const options = {
		strict: true, noEmit: true, target: ts.ScriptTarget.ESNext, types: [], ...overrides,
	};
	const host = ts.createCompilerHost(options);
	const getSourceFile = host.getSourceFile.bind(host);
	host.getSourceFile = (file, languageVersion, onError) => file === filename ? ts.createSourceFile(file, code, languageVersion, true) : getSourceFile(file, languageVersion, onError);
	return ts.createProgram([filename], options, host);
}

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {programs: [getTypeScriptProgram(code, {noLib: true})]},
	},
});

test.snapshot({
	valid: [
		...[
			'interface First {radius: number} interface Second {side: number}',
			'type First = "a" | "b"; type Second = "b" | "c";',
			'type First = any; type Second = number;',
			'type First = unknown; type Second = number;',
			'type First = {kind?: "a"}; type Second = {kind?: "b"};',
			'type First = {kind: "a"} | {kind: "b"}; type Second = {kind: "b"} | {kind: "c"};',
			'type First = boolean & {readonly brand: unique symbol}; type Second = true;',
			'type First = true & {readonly brand: unique symbol}; type Second = true;',
			'type First = false & {readonly brand: unique symbol}; type Second = false;',
			'type First = 0n; type Second = -0n;',
		].map(types => typeAware(`${types} declare const x: unknown; declare function first(value: unknown): value is First; declare function second(value: unknown): value is Second; first(x) ? (enabled ? 1 : undefined) : (second(x) ? 2 : undefined);`)),
		typeAware('declare const x: unknown; declare function first<T>(value: T): value is T & {kind: "a"}; declare function second<T>(value: T): value is T & {kind: "b"}; first(x) ? (enabled ? 1 : undefined) : (second(x) ? 2 : undefined);'),
		typeAware('declare const x: number | string; declare function first(value: unknown): value is number; declare function second(value: number): value is number; declare function second(value: string): value is string; declare function second(value: number | string): value is number | string; first(x) ? (x > 0 ? x : undefined) : (second(x) ? x : undefined);'),
		typeAware('declare const x: unknown; declare function first(value: unknown): asserts value is string; declare function second(value: unknown): asserts value is number; first(x) ? (enabled ? 1 : undefined) : (second(x) ? 2 : undefined);'),
		typeAware('type First = {kind: "a"}; type Second = {kind: "b"}; declare const x: First | Second; function first(value: First | Second): value is First { mutate(); return value.kind === "a"; } declare function second(value: First | Second): value is Second; first(x) ? (enabled ? 1 : undefined) : (second(x) ? 2 : undefined);'),
		typeAware('type Target<T> = T extends string ? string : any; function example<T>(x: unknown, enabled: boolean, first: (value: unknown) => value is Target<T>, second: (value: unknown) => value is number) { return first(x) ? (enabled ? 1 : undefined) : (second(x) ? 2 : undefined); }'),
		typeAware('type Target<T> = T extends string ? {kind: "a"} : any; function example<T>(x: unknown, enabled: boolean, first: (value: unknown) => value is Target<T>, second: (value: unknown) => value is {kind: "b"}) { return first(x) ? (enabled ? 1 : undefined) : (second(x) ? 2 : undefined); }'),
		typeAware('type Target<T> = T extends string ? {kind: "a"} : any; function example<T>(x: unknown, enabled: boolean, first: (value: unknown) => value is Target<T> & {}, second: (value: unknown) => value is {kind: "b"}) { return first(x) ? (enabled ? 1 : undefined) : (second(x) ? 2 : undefined); }'),
		{code: 'declare const x: unknown; declare function first(value: unknown): value is string; declare function second(value: unknown): value is number; first(x) ? (enabled ? 1 : undefined) : (second(x) ? 2 : undefined);', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		...[
			'type First = string; type Second = number;',
			'type First = "a" | "b"; type Second = "c" | "d";',
			'type First = {kind: "a"; radius: number}; type Second = {kind: "b"; side: number};',
			'type First = {kind: "a"} | {kind: "b"}; type Second = {kind: "c"};',
			'type First = true; type Second = false;',
			'type First = 1n; type Second = 2n;',
			'type First = {kind: true}; type Second = {kind: false};',
		].map(types => typeAware(`${types} declare const x: unknown; declare function first(value: unknown): value is First; declare function second(value: unknown): value is Second; first(x) ? (enabled ? 1 : undefined) : (second(x) ? 2 : undefined);`)),
		{code: 'declare const x: number; x === 1 ? a : (x === 2 ? b : (x === 3 ? a : c));', languageOptions: {parser: parsers.typescript}},
		{code: 'const first = (value: {kind: number}) => value.kind === 1; const second = (value: {kind: number}) => value.kind === 2; first(x) ? (enabled ? a : c) : (second(x) ? b : c);', languageOptions: {parser: parsers.typescript}},
		...[
			'first(x) ? a : (second(x) ? b : (third(x) ? a : c))',
			'first(x) ? a : (second(x) ? c : (third(x) ? b : c))',
		].map(expression => typeAware(outdent`
			declare const x: unknown;
			declare function first(value: unknown): value is 'first';
			declare function second(value: unknown): value is 'second';
			declare function third(value: unknown): value is 'third';
			${expression};
		`)),
	],
});

nodeTest('chain fixes preserve results and branch execution', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'no-unnecessary-nested-ternary': rule}}},
		rules: {'unicorn/no-unnecessary-nested-ternary': 'error'},
	};
	for (const expression of [
		'x === 1 ? branch("a") : (x === 2 ? branch("b") : (x === 3 ? branch("a") : branch("c")))',
		'x === 1 ? branch("a") : (x === 2 ? branch("c") : (x === 3 ? branch("b") : branch("c")))',
		'x === 1 ? (y ? branch("a") : branch("c")) : (x === 2 ? branch("b") : branch("c"))',
		'x === 1 ? (y ? branch("c") : branch("a")) : (x === 2 ? branch("b") : branch("c"))',
		'first(x) ? (y ? branch("a") : branch("c")) : (second(x) ? branch("b") : branch("c"))',
		'x === 1 ? branch("a") : (enabled && x === 2 ? branch("b") : (x === 3 ? branch("a") : branch("c")))',
		'x === 1 ? branch("a") : (x === 2 ? branch("b") : (enabled && x === 3 ? branch("a") : branch("c")))',
		'enabled && x === 1 ? branch("c") : (x === 2 ? branch("a") : (x === 3 ? branch("b") : branch("c")))',
		'enabled && x === 1 ? (y ? branch("a") : branch("c")) : (x === 2 ? branch("b") : branch("c"))',
		'gatedFirst(x) ? (y ? branch("a") : branch("c")) : (second(x) ? branch("b") : branch("c"))',
	]) {
		const code = `const seen = []; const branch = value => { seen.push(value); return value; }; const first = value => value === 1; const gatedFirst = value => enabled && value === 1; const second = value => value === 2; const result = ${expression}; JSON.stringify({seen, result});`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		for (const x of [undefined, null, false, true, -1, 0, 1, 2, 3, 4, '1', 1n, {}]) {
			for (const y of [false, true, 0, 1, '', 'value']) {
				for (const enabled of [false, true]) {
					t.assert.strictEqual(runInNewContext(output, {x, y, enabled}), runInNewContext(code, {x, y, enabled}));
				}
			}
		}
	}
});

nodeTest('tagged templates and spreads that mutate the tested value prevent chain fixes', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'no-unnecessary-nested-ternary': rule}}},
		rules: {'unicorn/no-unnecessary-nested-ternary': 'error'},
	};
	for (const [setup, condition] of [
		['const mutate = () => { x = 3; return false; };', 'x === 2 && mutate`value`'],
		['const values = { *[Symbol.iterator]() { x = 3; } };', 'x === 2 && [...values].length'],
	]) {
		const code = `let x = 2; ${setup} x === 1 ? "a" : (${condition} ? "b" : (x === 3 ? "a" : "c"));`;
		t.assert.strictEqual(runInNewContext(code), 'a');
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, false);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(output), 'a');
	}
});

nodeTest('type-aware guard suggestions preserve the ordinary discriminated-union case', t => {
	const filename = typeScriptFilename;
	const code = `
		type Circle = {kind: 'circle'; radius: number};
		type Square = {kind: 'square'; side: number};
		declare function isCircle(shape: Circle | Square): shape is Circle;
		declare function isSquare(shape: Circle | Square): shape is Square;
		function result(shape: Circle | Square) {
			return isCircle(shape) ? (shape.radius > 0 ? shape.radius : undefined) : (isSquare(shape) ? shape.side : undefined);
		}
		const shapes: (Circle | Square)[] = [{kind: 'circle', radius: -1}, {kind: 'circle', radius: 0}, {kind: 'circle', radius: 2}, {kind: 'square', side: 5}];
		JSON.stringify(shapes.map(result));
	`;
	const program = getTypeScriptProgram(code);
	t.assert.deepStrictEqual(ts.getPreEmitDiagnostics(program), []);
	const config = {
		files: ['**/*.ts'],
		languageOptions: {parser: typescriptEslintParser, parserOptions: {programs: [program]}},
		plugins: {unicorn: {rules: {'no-unnecessary-nested-ternary': rule}}},
		rules: {'unicorn/no-unnecessary-nested-ternary': 'error'},
	};
	const linter = new Linter();
	const messages = linter.verify(code, config, {filename});
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].fix, undefined);
	t.assert.strictEqual(messages[0].suggestions.length, 1);
	const {fix} = messages[0].suggestions[0];
	const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	t.assert.deepStrictEqual(ts.getPreEmitDiagnostics(getTypeScriptProgram(output)), []);
	const execute = text => runInNewContext(ts.transpileModule(text, {compilerOptions: {target: ts.ScriptTarget.ESNext}}).outputText, {
		isCircle: shape => shape.kind === 'circle',
		isSquare: shape => shape.kind === 'square',
	});
	t.assert.strictEqual(execute(output), execute(code));
	for (const options of [{strict: false}, {strictNullChecks: false}]) {
		const uncheckedProgram = getTypeScriptProgram(code, options);
		t.assert.deepStrictEqual(linter.verify(code, {
			...config,
			languageOptions: {parser: typescriptEslintParser, parserOptions: {programs: [uncheckedProgram]}},
		}, {filename}), []);
	}
});

nodeTest('typed chain merges require review when they lose overload narrowing', t => {
	const filename = typeScriptFilename;
	const code = `
		type First = {kind: 'first'};
		type Second = {kind: 'second'};
		type Third = {kind: 'third'};
		declare function read(value: First): number;
		declare function read(value: Third): number;
		function result(value: First | Second | Third) {
			return value.kind === 'first' ? read(value) : (value.kind === 'second' ? 0 : (value.kind === 'third' ? read(value) : -1));
		}
	`;
	const program = getTypeScriptProgram(code);
	t.assert.deepStrictEqual(ts.getPreEmitDiagnostics(program), []);
	const linter = new Linter();
	const messages = linter.verify(code, {
		files: ['**/*.ts'],
		languageOptions: {parser: typescriptEslintParser, parserOptions: {programs: [program]}},
		plugins: {unicorn: {rules: {'no-unnecessary-nested-ternary': rule}}},
		rules: {'unicorn/no-unnecessary-nested-ternary': 'error'},
	}, {filename});
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].fix, undefined);
	t.assert.strictEqual(messages[0].suggestions.length, 1);
	const {fix} = messages[0].suggestions[0];
	const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	t.assert.ok(ts.getPreEmitDiagnostics(getTypeScriptProgram(output)).some(diagnostic => diagnostic.code === 2769));
});

test({
	valid: [],
	invalid: [
		['check(/* keep */) ? (inner ? value : fallback) : fallback;', 'check(/* keep */) && inner ? value : fallback;'],
		['outer ? (inner(/* keep */) ? value : fallback) : fallback;', 'outer && inner(/* keep */) ? value : fallback;'],
		['outer ? (inner ? value(/* keep */) : fallback) : fallback;', 'outer && inner ? value(/* keep */) : fallback;'],
		['outer ? value : (inner ? value : fallback(/* keep */));', 'outer || inner ? value : fallback(/* keep */);'],
		['check(// keep\r\n) ? (inner ? value : fallback) : fallback;', 'check(// keep\r\n) && inner ? value : fallback;'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test({
	valid: [],
	invalid: [
		{
			code: 'outer ? (inner ? (value as /* keep */ string) : fallback) : fallback;',
			output: 'outer && inner ? (value as /* keep */ string) : fallback;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		...[
			'outer ? value(/* keep */) : (inner ? value(/* keep */) : fallback);',
			'outer ? (inner ? value : fallback(/* keep */)) : fallback(/* keep */);',
			'outer ? /* keep */ (inner ? value : fallback) : fallback;',
		].map(code => ({code, errors: 1})),
	],
});

nodeTest('comment-preserving ternary fixes retain short-circuit evaluation', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'no-unnecessary-nested-ternary': rule}}},
		rules: {'unicorn/no-unnecessary-nested-ternary': 'error'},
	};
	for (const expression of [
		'read(/* keep */ "outer", outer) ? (read("inner", inner) ? read("value", 1) : read("fallback", 2)) : read("fallback", 2)',
		'read(/* keep */ "outer", outer) ? read("value", 1) : (read("inner", inner) ? read("value", 1) : read("fallback", 2))',
		'read(/* keep */ "outer", outer) ? (read("inner", inner) ? read("fallback", 2) : read("value", 1)) : read("fallback", 2)',
		'read(/* keep */ "outer", outer) ? read("fallback", 2) : (read("inner", inner) ? read("value", 1) : read("fallback", 2))',
	]) {
		const code = `const seen = []; const read = (name, value) => { seen.push(name); return value; }; const result = ${expression}; JSON.stringify({seen, result});`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.ok(output.includes('/* keep */'));
		for (const outer of [false, 0, '', true, 'value']) {
			for (const inner of [false, 0, '', true, 'value']) {
				t.assert.strictEqual(runInNewContext(output, {outer, inner}), runInNewContext(code, {outer, inner}));
			}
		}
	}
});

test({
	valid: [
		'a ? b : c;',
		'a ? (b ? c : d) : e;',
		'a ? e : (b ? c : d);',
		'a ? (b ? c : d) : (b ? c : d);',
		'foo ? (bar ? baz : object?.property) : object.property;',
		'foo ? object.property : (bar ? object?.property : baz);',
		'foo ? (bar ? baz : object.property) : object["property"];',
		'foo ? (bar ? baz : object[qux?.property]) : object[qux.property];',
		{
			code: 'foo ? (bar ? baz : object?.property!) : object.property;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'foo ? object.property : (bar ? object?.property as string : baz);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'foo ? fallback! : (bar ? fallback : baz);',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		{
			code: 'a ? b ? c : d : d;',
			output: 'a && b ? c : d;',
			errors: 1,
		},
		{
			code: 'a ? d : b ? d : c;',
			output: 'a || b ? d : c;',
			errors: 1,
		},
		{
			code: 'a ? (b ? c : d) : d;',
			output: 'a && b ? c : d;',
			errors: 1,
		},
		{
			code: 'a ? d : (b ? d : c);',
			output: 'a || b ? d : c;',
			errors: 1,
		},
		{
			code: 'foo ? (bar ? baz : qux) : qux;',
			output: 'foo && bar ? baz : qux;',
			errors: 1,
		},
		{
			code: 'foo ? qux : (bar ? qux : baz);',
			output: 'foo || bar ? qux : baz;',
			errors: 1,
		},
		{
			code: 'foo ? (bar ? baz : qux()) : qux();',
			output: 'foo && bar ? baz : qux();',
			errors: 1,
		},
		{
			code: 'foo ? (bar ? baz : object?.property) : object?.property;',
			output: 'foo && bar ? baz : object?.property;',
			errors: 1,
		},
		{
			code: 'foo ? (bar ? baz : 1) : 1;',
			output: 'foo && bar ? baz : 1;',
			errors: 1,
		},
		{
			code: '(foo || bar) ? (baz ?? qux ? value : fallback) : fallback;',
			output: '(foo || bar) && (baz ?? qux) ? value : fallback;',
			errors: 1,
		},
		{
			code: 'foo ? fallback : (bar || baz ? fallback : value);',
			output: 'foo || bar || baz ? fallback : value;',
			errors: 1,
		},
		{
			code: 'foo ? (bar ? await baz : fallback) : fallback;',
			output: 'foo && bar ? (await baz) : fallback;',
			errors: 1,
		},
		{
			code: 'foo ? (bar ? baz = qux : fallback) : fallback;',
			output: 'foo && bar ? (baz = qux) : fallback;',
			errors: 1,
		},
		{
			code: 'foo ? (bar ? baz : fallback /* comment */) : fallback;',
			errors: 1,
		},
		{
			code: 'foo ? (bar ? baz as string : fallback) : fallback;',
			output: 'foo && bar ? (baz as string) : fallback;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'foo ? (bar ? baz : object?.property!) : object?.property!;',
			output: 'foo && bar ? baz : object?.property!;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'foo\na || b ? (c ? x : y) : y',
			output: 'foo\n;(a || b) && c ? x : y',
			errors: 1,
		},
	],
});

test.snapshot({
	valid: [],
	invalid: [
		'x === 1 ? a : (x === 2 && mutate() ? c : (x === 3 ? b : c));',
		'outer ? (inner ?? other ? fallback : value) : fallback;',
		'outer ? fallback : (inner || other ? value : fallback);',
		'outer ? ((first, second) ? fallback : value) : fallback;',
		'outer ? (counter++ ? fallback : value) : fallback;',
		'async function run() { return outer ? (await check() ? fallback : value) : fallback; }',
		'function* run() { return outer ? fallback : ((yield check()) ? value : fallback); }',
		'outer ? (inner(/* keep */) ? fallback : value) : fallback;',
		'outer ? fallback : (inner(/* keep */) ? value : fallback);',
		'outer ? (inner ? fallback(/* keep */) : value) : fallback(/* keep */);',
		'outer ? fallback(/* keep */) : (inner ? value : fallback(/* keep */));',
		'object.kind === "a" ? a : (object[`kind`] === "b" ? b : (object["kind"] === "c" ? a : c));',
		{
			code: outdent`
				const first = ((value: {kind: number}) => value.kind === 1) as (value: {kind: number}) => boolean;
				const second = (value: {kind: number}) => value.kind === 2;
				first(x) ? (enabled ? a : c) : (second(x) ? b : c);
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				const first = ((value: {kind: number}) => value.kind === 1) satisfies (value: {kind: number}) => boolean;
				const second = (value: {kind: number}) => value.kind === 2;
				first(x) ? (enabled ? a : c) : (second(x) ? b : c);
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				const first = (value: {kind: number}) => value.kind === 1;
				const second = (value: {kind: number}) => value.kind === 2;
				(first(x) as boolean) ? (enabled ? a : c) : (second(x)! ? b : c);
			`,
			languageOptions: {parser: parsers.typescript},
		},
	],
});

nodeTest('new typed inverse folds require review', t => {
	const linter = new Linter();
	const config = {
		languageOptions: {parser: typescriptEslintParser},
		plugins: {unicorn: {rules: {'no-unnecessary-nested-ternary': rule}}},
		rules: {'unicorn/no-unnecessary-nested-ternary': 'error'},
	};
	for (const code of ['a ? (b ? d : c) : d;', 'a ? c : (b ? d : c);']) {
		const messages = linter.verify(code, config);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].fix, undefined);
		t.assert.strictEqual(messages[0].suggestions.length, 1);
		t.assert.strictEqual(linter.verifyAndFix(code, config).fixed, false);
	}
});
