import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {Linter} from 'eslint';
import {outdent} from 'outdent';
import plugin from '../../index.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

const filename = path.resolve('file.ts');
const compilerOptions = {
	strict: true, noEmit: true, allowJs: true, checkJs: true, target: ts.ScriptTarget.ESNext,
};

function getProgram(code, sourceFilename = filename) {
	sourceFilename = sourceFilename.replaceAll('\\', '/');
	const host = ts.createCompilerHost(compilerOptions);
	const getSourceFile = host.getSourceFile.bind(host);
	host.getSourceFile = (file, languageVersion, onError) => file === sourceFilename
		? ts.createSourceFile(file, code, languageVersion, true)
		: getSourceFile(file, languageVersion, onError);
	return ts.createProgram([sourceFilename], compilerOptions, host);
}

function getDiagnostics(program) {
	return ts.getPreEmitDiagnostics(program)
		.filter(diagnostic => diagnostic.file?.fileName === program.getRootFileNames()[0])
		.map(diagnostic => diagnostic.code);
}

function getMessages(code, program, options = {}) {
	const linter = new Linter();
	return linter.verify(code, {
		files: ['**/*.{js,ts}'],
		languageOptions: {parser: typescriptEslintParser, parserOptions: program ? {programs: [program]} : {}},
		plugins: {unicorn: plugin},
		rules: {'unicorn/prefer-minimal-ternary': ['error', options]},
	}, {filename: program?.getRootFileNames()[0] ?? filename});
}

test('loads virtual source files with Windows path separators', t => {
	const program = getProgram('const value: string = 1;', filename.replaceAll('/', '\\'));
	t.assert.ok(program.getSourceFile(program.getRootFileNames()[0]));
	t.assert.deepStrictEqual(getDiagnostics(program), [2322]);
});

const cases = [
	{
		name: 'correlated rest tuple arguments',
		declarations: 'declare function consume(...arguments_: ["a", string] | ["b", number]): void; declare const value: string | number;',
		expression: 'typeof value === "string" ? consume("a", value) : consume("b", value)',
		unsafeExpression: 'consume(typeof value === "string" ? "a" : "b", value)',
		diagnostic: 2345,
	},
	{
		name: 'correlated constructor rest tuple arguments',
		declarations: 'declare class Box {constructor(...arguments_: ["a", string] | ["b", number]);} declare const value: string | number;',
		expression: 'typeof value === "string" ? new Box("a", value) : new Box("b", value)',
		unsafeExpression: 'new Box(typeof value === "string" ? "a" : "b", value)',
		diagnostic: 2345,
	},
	{
		name: 'overloaded shared methods',
		declarations: 'declare const test: boolean, object: {method(value: string): string; method(value: number): string};',
		expression: 'test ? object.method("a") : object.method(1)',
		unsafeExpression: 'object.method(test ? "a" : 1)',
		diagnostic: 2769,
	},
	{
		name: 'shared method this receiver narrowing',
		declarations: 'interface A {kind: "a"; method(this: A, value: string): string} interface B {kind: "b"; method(this: B, value: string): string} declare const value: A | B;',
		expression: 'value.kind === "a" ? value.method("a") : value.method("b")',
		unsafeExpression: 'value.method(value.kind === "a" ? "a" : "b")',
		diagnostic: 2684,
	},
	{
		name: 'binary operand narrowing',
		declarations: 'declare const value: string | number;',
		expression: 'typeof value === "string" ? value + "a" : value + 1',
		unsafeExpression: 'value + (typeof value === "string" ? "a" : 1)',
		diagnostic: 2365,
	},
	{
		name: 'mixed binary operand types',
		declarations: 'declare const test: boolean;',
		expression: 'test ? 1 + "a" : 1 + 2',
		unsafeExpression: '1 + (test ? "a" : 2)',
		diagnostic: 2365,
	},
	{
		name: 'member receiver narrowing',
		declarations: 'declare const value: string | {byteLength: number};',
		expression: 'typeof value === "string" ? value.length : value.byteLength',
		unsafeExpression: 'value[typeof value === "string" ? "length" : "byteLength"]',
		diagnostic: 7053,
		options: {checkComputedMemberAccess: true},
	},
	{
		name: 'method receiver narrowing with compatible signatures',
		declarations: 'declare const value: string | number;',
		expression: 'typeof value === "string" ? value.toString() : value.toFixed()',
		unsafeExpression: 'value[typeof value === "string" ? "toString" : "toFixed"]()',
		diagnostic: 7053,
		options: {checkComputedMemberAccess: true},
	},
	{
		name: 'overloaded calls',
		declarations: 'declare function read(value: string): string; declare function read(value: number): number; declare const test: boolean;',
		expression: 'test ? read("a") : read(1)',
		unsafeExpression: 'read(test ? "a" : 1)',
		diagnostic: 2769,
	},
	{
		name: 'overloaded constructors',
		declarations: 'declare class Box { constructor(value: string); constructor(value: number); } declare const test: boolean;',
		expression: 'test ? new Box("a") : new Box(1)',
		unsafeExpression: 'new Box(test ? "a" : 1)',
		diagnostic: 2769,
	},
	{
		name: 'discriminated object properties',
		declarations: 'type Shape = {kind: "a"; value: string} | {kind: "b"; value: number}; declare const value: string | number;',
		resultType: 'Shape',
		expression: 'typeof value === "string" ? {kind: "a", value} : {kind: "b", value}',
		unsafeExpression: '({kind: typeof value === "string" ? "a" : "b", value})',
		diagnostic: 2322,
	},
	{
		name: 'generic tuple inference',
		declarations: 'declare function pair<T extends string | number>(value: T): [T, T]; declare const test: boolean;',
		resultType: '[string, string] | [number, number]',
		expression: 'test ? pair("a") : pair(1)',
		unsafeExpression: 'pair(test ? "a" : 1)',
		diagnostic: 2322,
	},
	{
		name: 'tuple union inference',
		declarations: 'declare const test: boolean, first: string, second: number;',
		resultType: '[string] | [number]',
		expression: 'test ? [first] : [second]',
		unsafeExpression: '[test ? first : second]',
		diagnostic: 2322,
	},
	{
		name: 'generic parameter narrowing',
		declarations: 'declare function consume<T extends "a" | "b">(kind: T, value: [T] extends ["a"] ? string : number): void; declare const value: string | number;',
		expression: 'typeof value === "string" ? consume("a", value) : consume("b", value)',
		unsafeExpression: 'consume(typeof value === "string" ? "a" : "b", value)',
		diagnostic: 2345,
	},
	{
		name: 'incompatible varying callees',
		declarations: 'declare function first(value: string): void; declare function second(value: number): void; declare const test: boolean, value: any;',
		expression: 'test ? first(value) : second(value)',
		unsafeExpression: '(test ? first : second)(value)',
		diagnostic: 2345,
		options: {checkVaryingBase: true},
	},
	{
		name: 'incompatible varying methods',
		declarations: 'declare const object: {first(value: string): void; second(value: number): void}; declare const test: boolean, value: any;',
		expression: 'test ? object.first(value) : object.second(value)',
		unsafeExpression: 'object[test ? "first" : "second"](value)',
		diagnostic: 2345,
		options: {checkComputedMemberAccess: true},
	},
];

for (const {name, declarations, expression, unsafeExpression, resultType, diagnostic, options} of cases) {
	test(`withholds fixes that break ${name}`, t => {
		const declaration = `${declarations} const result${resultType ? `: ${resultType}` : ''} = `;
		const code = `${declaration}${expression};`;
		const program = getProgram(code);
		t.assert.deepStrictEqual(getDiagnostics(program), []);
		t.assert.ok(getDiagnostics(getProgram(`${declaration}${unsafeExpression};`)).includes(diagnostic));
		const syntaxMessages = getMessages(code, undefined, options);
		t.assert.strictEqual(syntaxMessages.length, 1);
		t.assert.strictEqual(syntaxMessages[0].fix?.text, unsafeExpression);
		const messages = getMessages(code, program, options);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].messageId, 'prefer-minimal-ternary');
		t.assert.strictEqual(messages[0].fix, undefined);
	});
}

const safeCases = [
	{
		name: 'ordinary shared methods',
		declarations: 'declare const test: boolean, object: {method(value: string | number): string};',
		expression: 'test ? object.method("a") : object.method(1)',
		fixedExpression: 'object.method(test ? "a" : 1)',
	},
	{
		name: 'ordinary arithmetic with varying literal operands',
		declarations: 'declare const test: boolean, value: number;',
		expression: 'test ? value + 1 : value + 2',
		fixedExpression: 'value + (test ? 1 : 2)',
	},
	{
		name: 'ordinary arithmetic with a shared right operand',
		declarations: 'declare const test: boolean, first: number, second: number;',
		expression: 'test ? first + 1 : second + 1',
		fixedExpression: '(test ? first : second) + 1',
	},
	{
		name: 'ordinary property selection with different result types',
		declarations: 'declare const test: boolean, object: {first: string; second: number};',
		expression: 'test ? object.first : object.second',
		fixedExpression: 'object[test ? "first" : "second"]',
		options: {checkComputedMemberAccess: true},
	},
	{
		name: 'ordinary method selection',
		declarations: 'declare const test: boolean, object: {first(): string; second(): string};',
		expression: 'test ? object.first() : object.second()',
		fixedExpression: 'object[test ? "first" : "second"]()',
		options: {checkComputedMemberAccess: true},
	},
	{
		name: 'ordinary enum selection',
		declarations: 'enum Choice {First, Second} declare const test: boolean;',
		expression: 'test ? Choice.First : Choice.Second',
		fixedExpression: 'Choice[test ? "First" : "Second"]',
		options: {checkComputedMemberAccess: true},
	},
	{
		name: 'ordinary calls',
		declarations: 'declare function read(value: string | number): string; declare const test: boolean;',
		expression: 'test ? read("a") : read(1)',
		fixedExpression: 'read(test ? "a" : 1)',
	},
	{
		name: 'the same overload',
		declarations: 'declare function read(value: string): string; declare function read(value: number): number; declare const test: boolean;',
		expression: 'test ? read("a") : read("b")',
		fixedExpression: 'read(test ? "a" : "b")',
	},
	{
		name: 'ordinary constructors',
		declarations: 'declare class Box { constructor(value: string | number); } declare const test: boolean;',
		expression: 'test ? new Box("a") : new Box(1)',
		fixedExpression: 'new Box(test ? "a" : 1)',
	},
	{
		name: 'ordinary object properties',
		declarations: 'declare const test: boolean;',
		expression: 'test ? {value: 1} : {value: 2}',
		fixedExpression: '({value: test ? 1 : 2})',
	},
	{
		name: 'ordinary array elements',
		declarations: 'declare const test: boolean;',
		expression: 'test ? [1] : [2]',
		fixedExpression: '[test ? 1 : 2]',
	},
	{
		name: 'compatible generic inference',
		declarations: 'declare function pair<T>(value: T): [T, T]; declare const test: boolean, first: string, second: string;',
		expression: 'test ? pair(first) : pair(second)',
		fixedExpression: 'pair(test ? first : second)',
	},
	{
		name: 'compatible varying callees',
		declarations: 'declare function first(value: string): void; declare function second(value: string): void; declare const test: boolean, value: string;',
		expression: 'test ? first(value) : second(value)',
		fixedExpression: '(test ? first : second)(value)',
		options: {checkVaryingBase: true},
	},
];

for (const {name, declarations, expression, fixedExpression, options} of safeCases) {
	test(`fixes ${name} with type information`, t => {
		const code = `${declarations} const result = ${expression};`;
		const program = getProgram(code);
		t.assert.deepStrictEqual(getDiagnostics(program), []);
		const messages = getMessages(code, program, options);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].messageId, 'prefer-minimal-ternary');
		const {fix} = messages[0];
		t.assert.ok(fix);
		const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		t.assert.strictEqual(output, `${declarations} const result = ${fixedExpression};`);
		t.assert.deepStrictEqual(getDiagnostics(getProgram(output)), []);
	});
}

test('withholds shared-callee fixes with rest parameters', t => {
	const code = 'declare function consume(...values: string[]): void; declare const condition: boolean; condition ? consume("a") : consume("b");';
	const program = getProgram(code);
	t.assert.deepStrictEqual(getDiagnostics(program), []);
	const messages = getMessages(code, program);
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].messageId, 'prefer-minimal-ternary');
	t.assert.strictEqual(messages[0].fix, undefined);
});

test('fixes typed JavaScript calls with JSDoc parameters', t => {
	const sourceFilename = path.resolve('file.js');
	const code = outdent`
		/** @param {string | number} value */
		function read(value) {
			return String(value);
		}
		const condition = Boolean(1);
		const result = condition ? read("a") : read(1);
	`;
	const program = getProgram(code, sourceFilename);
	t.assert.deepStrictEqual(getDiagnostics(program), []);
	const messages = getMessages(code, program);
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].messageId, 'prefer-minimal-ternary');
	const {fix} = messages[0];
	t.assert.ok(fix);
	t.assert.strictEqual(fix.text, 'read(condition ? "a" : 1)');
	const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	t.assert.deepStrictEqual(getDiagnostics(getProgram(output, sourceFilename)), []);
});

test('withholds typed JavaScript fixes with JSDoc rest parameters', t => {
	const code = outdent`
		/** @param {...string} values */
		function read(...values) {
			return values.length;
		}
		const condition = Boolean(1);
		const result = condition ? read("a") : read("b");
	`;
	const program = getProgram(code, path.resolve('file.js'));
	t.assert.deepStrictEqual(getDiagnostics(program), []);
	const syntaxMessages = getMessages(code);
	t.assert.strictEqual(syntaxMessages.length, 1);
	t.assert.ok(syntaxMessages[0].fix);
	const messages = getMessages(code, program);
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].messageId, 'prefer-minimal-ternary');
	t.assert.strictEqual(messages[0].fix, undefined);
});

test('preserves shared method receivers and argument evaluation order', t => {
	const code = outdent`
		const events = [];
		const object = {
			prefix: "receiver:",
			method(value) {
				events.push(this.prefix);
				return this.prefix + value;
			},
		};
		function argument(value) {
			events.push(value);
			return value;
		}
		const result = condition ? object.method(argument("a")) : object.method(argument("b"));
		JSON.stringify({result, events});
	`;
	const messages = getMessages(code);
	t.assert.strictEqual(messages.length, 1);
	const {fix} = messages[0];
	t.assert.ok(fix);
	const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	for (const condition of [true, false]) {
		const value = condition ? 'a' : 'b';
		const expected = JSON.stringify({result: `receiver:${value}`, events: [value, 'receiver:']});
		t.assert.strictEqual(vm.runInNewContext(code, {condition}), expected);
		t.assert.strictEqual(vm.runInNewContext(output, {condition}), expected);
	}
});
