import assert from 'node:assert/strict';
import path from 'node:path';
import outdent from 'outdent';
import typescript from 'typescript';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);
const existingOptionsOnly = {checkWithoutOptionsObject: false};
const allOptionalParameters = {checkWithoutOptionsObject: true};

const typeAware = code => ({
	code,
	filename: 'file.ts',
	options: [existingOptionsOnly],
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		...[
			'function run() {}',
			'function run(input, output) {}',
			'function run(input, verbose = false) {}',
			'function run(verbose = false) {}',
			'function run(input, {verbose = false, retries = 3} = {}) {}',
			'function run(options = {}) {}',
			'function run(verbose = false, retries = 3, required) {}',
			'function run(verbose = false, retries = 3, ...rest) {}',
			'function run(verbose = false, retries = 3, [value] = []) {}',
			'function run([value] = [], verbose = false) {}',
			'function run(verbose = false, required, retries = 3) {}',
			'function run({verbose = false}, retries = 3) {}',
			'const {verbose = false, retries = 3} = options;',
		].map(code => ({code, options: [allOptionalParameters]})),
		...[
			'function run(input, verbose = false, retries = 3) {}',
			'function run(input, settings = {}, verbose = false) {}',
			'function run(verbose = false, values = []) {}',
			'function run(verbose = false, callback = () => {}) {}',
			'function run(verbose = false, date = new Date()) {}',
			'function run(verbose = false, options = getOptions()) {}',
			'const defaults = getOptions(); function run(verbose = false, options = defaults) {}',
			'function run(verbose = false, options = undefined) {}',
			'function run(verbose = false, options = null) {}',
			'function run(verbose = false, options) {}',
			'function run(verbose = false, retries = 3, required, options = {}) {}',
			'function run(verbose = false, options = Object.freeze({__proto__: [], encoding: "utf8"})) {}',
			'let defaults = {}; defaults = []; function run(verbose = false, options = defaults) {}',
		].map(code => ({code, options: [existingOptionsOnly]})),
		{code: 'function run(input: string, verbose?: boolean) {}', languageOptions: {parser: parsers.typescript}, options: [allOptionalParameters]},
		{code: 'function run(verbose = false, options?: Options) {}', languageOptions: {parser: parsers.typescript}, options: [existingOptionsOnly]},
		{code: 'class Runner { constructor(public verbose = false, retries = 3) {} }', languageOptions: {parser: parsers.typescript}, options: [allOptionalParameters]},
	],
	invalid: [
		...[
			'function run(verbose = false, retries = 3) {}',
			'function run(input, verbose = false, retries = 3) {}',
			'function run(input, first = 1, second = 2, third = 3) {}',
			'function run([value] = [], verbose = false, retries = 3) {}',
			'const run = function(verbose = false, retries = 3) {};',
			'const run = (verbose = false, retries = 3) => verbose;',
			'async function run(verbose = false, retries = 3) {}',
			'function * run(verbose = false, retries = 3) {}',
			'const object = {run(verbose = false, retries = 3) {}};',
			'class Runner { constructor(verbose = false, retries = 3) {} }',
			'class Runner { static run(verbose = false, retries = 3) {} }',
			'class Runner { #run(verbose = false, retries = 3) {} }',
			'function outer() { return (verbose = false, retries = 3) => {}; }',
		].map(code => ({code, options: [allOptionalParameters]})),
		{
			code: 'const component = <Button onClick={(verbose = false, retries = 3) => null} />;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
			options: [allOptionalParameters],
		},
		'function run(verbose = false, {retries = 3}) {}',
		'function run(verbose = false, {retries = 3} = {}) {}',
		'function run(verbose = false, options = {}) {}',
		'function run(verbose = false, options = {encoding: getEncoding()}) {}',
		'function run(verbose = false, retries = 3, options = {}) {}',
		'function run(input, verbose /* setting */ = false, /* options */ {retries = 3} = {}) {}',
		outdent`
			function updateSelection(
				graph,
				modules,
				transform = null,
				{
					shouldScrollToSelected = true,
					shouldIncludeRelated = true,
				} = {},
			) {}
		`,
		{
			code: outdent`
				function updateSelection(
					graph,
					modules,
					transform = null,
					shouldScrollToSelected = true,
				) {}
			`,
			options: [allOptionalParameters],
		},
		...[
			'function run(verbose = false, {retries = 3} = {}) {}',
			'function run(verbose = false, {}) {}',
			'function run(verbose = false, options = {}) {}',
			'function run(input, verbose = false, settings = {}) {}',
			'function run(verbose = false, options = {encoding: getEncoding()}) {}',
			'const defaults = {}; function run(verbose = false, options = defaults) {}',
			'const defaults = {}; const alias = defaults; function run(verbose = false, options = alias) {}',
			'function run(verbose = false, options = Object.freeze({encoding: "utf8"})) {}',
			'const defaults = {encoding: "utf8"}; function run(verbose = false, options = Object.freeze(defaults)) {}',
		].map(code => ({code, options: [existingOptionsOnly]})),
		...[
			'function run(input: string, verbose?: boolean, retries?: number) {}',
			'function run(input: string, verbose = false, retries?: number) {}',
			'function run(this: Runner, verbose?: boolean, retries?: number) {}',
			'const run = <Value>(input: Value, verbose = false, retries = 3) => input;',
			'declare function run(verbose?: boolean, retries?: number): void;',
			'function run(verbose?: boolean, retries?: number): void; function run(verbose = false, retries = 3) {}',
			'type Runner = (verbose?: boolean, retries?: number) => void;',
			'type Runner = new (verbose?: boolean, retries?: number) => object;',
			'interface Runner { run(verbose?: boolean, retries?: number): void }',
			'interface Runner { (verbose?: boolean, retries?: number): void }',
			'interface Runner { new (verbose?: boolean, retries?: number): object }',
			'declare class Runner { constructor(verbose?: boolean, retries?: number) }',
			'declare class Runner { run(verbose?: boolean, retries?: number): void }',
			'abstract class Runner { abstract run(verbose?: boolean, retries?: number): void }',
			'class Runner { constructor(public input: string, verbose = false, retries = 3) {} }',
			'function run(verbose?: boolean, {retries = 3}: Options = {}) {}',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}, options: [allOptionalParameters]})),
		...[
			'function run(verbose = false, options = {encoding: getEncoding()} as Options) {}',
			'function run(verbose = false, options = {encoding: getEncoding()} satisfies Options) {}',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}, options: [existingOptionsOnly]})),
		{
			code: 'const defaults = {encoding: getEncoding()}; function run(verbose = false, options = defaults) {}',
			options: [existingOptionsOnly],
		},
		{
			code: 'const defaults = {encoding: getEncoding()} as const; function run(verbose = false, options = defaults) {}',
			languageOptions: {parser: parsers.typescript},
			options: [existingOptionsOnly],
		},
		...[
			'function run(verbose = false, options = Object.freeze({__proto__: null, encoding: "utf8"})) {}',
			'function run(verbose = false, required, retries = 3, options = {}) {}',
		].map(code => ({code, options: [existingOptionsOnly]})),
	],
});

test.snapshot({
	valid: [
		...[
			'function run(verbose = false, options?: MissingOptions) {}',
			'function run(verbose = false, options?: any) {}',
			'function run(verbose = false, options?: unknown) {}',
			'const token: unique symbol = Symbol(); function run(verbose = false, options?: typeof token) {}',
			'enum Choice { First, Second } function run(verbose = false, options?: Choice) {}',
			'function run(verbose = false, options?: object) {}',
			'function run(verbose = false, options?: {}) {}',
			'function run(verbose = false, options?: string[]) {}',
			'function run(verbose = false, options?: readonly string[]) {}',
			'function run(verbose = false, options?: [string, number]) {}',
			'function run(verbose = false, options?: () => void) {}',
			'function run(verbose = false, options?: new () => object) {}',
			'function run(verbose = false, options?: Date) {}',
			'function run(verbose = false, options?: URL) {}',
			'function run(verbose = false, options?: Map<string, string>) {}',
			'const run = (name: string, verbose = false, names?: ReadonlySet<string>) => {};',
			'function run(verbose = false, values?: ReadonlyMap<string, number>) {}',
			'function run(verbose = false, values?: Iterable<string>) {}',
			'function run(verbose = false, values?: AsyncIterable<string>) {}',
			'declare function readNames(): Iterable<string>; function run(verbose = false, names = readNames()) {}',
			'type Names = ReadonlySet<string>; function run(verbose = false, names?: Names) {}',
			'type Values = Iterable<string> | {encoding?: string}; function run(verbose = false, values?: Values) {}',
			'interface Values extends ReadonlyArray<string> {} function run(verbose = false, values?: Values) {}',
			'type Pair = [string, number]; interface Values extends Pair { label: string } function run(verbose = false, values?: Values) {}',
			'type Pair = readonly [name: string, count: number]; interface Values extends Pair {} function run(verbose = false, values?: Values) {}',
			'interface Values extends Set<string> {} function run(verbose = false, values?: Values) {}',
			outdent`
				interface Base { count: number }
				interface Left extends Base {}
				interface Right extends Base, Iterator<string> {}
				interface Names extends Left, Right {}
				function run(verbose = false, names?: Names) {}
			`,
			'type Base = Iterator<string> & {count: number}; interface Names extends Base { label: string } function run(verbose = false, names?: Names) {}',
			'class Options { encoding = "utf8" } function run(verbose = false, options?: Options) {}',
			'class Options<Value> { encoding?: Value } function run(verbose = false, options?: Options<string>) {}',
			'abstract class Options { encoding?: string } function run(verbose = false, options?: Options) {}',
			'class Options { private constructor() {} encoding?: string } function run(verbose = false, options?: Options) {}',
			'interface Options { (): void; encoding?: string } function run(verbose = false, options?: Options) {}',
			'interface Options { new (): object; encoding?: string } function run(verbose = false, options?: Options) {}',
			'type Options = {encoding?: string} | boolean; function run(verbose = false, options?: Options) {}',
			'type Options = {encoding?: string} | null; function run(verbose = false, options?: Options) {}',
			'type Options = {encoding?: string} & Date; function run(verbose = false, options?: Options) {}',
			'type Options = {encoding?: string} & (() => void); function run(verbose = false, options?: Options) {}',
			'interface Options { encoding?: string } function run(verbose = false, options?: Omit<Options, "encoding">) {}',
			'type Options = {encoding?: string} | undefined; function run(options?: Options) {}',
			'function run<Value>(verbose = false, options?: Value) {}',
			'function run(options?: {encoding?: string}) {}',
			'function run(first: number | undefined, options?: {encoding?: string}) {}',
			'function run(verbose = false, options?: {encoding?: string}, ...rest: unknown[]) {}',
		].map(code => typeAware(code)),
		...[
			'ArrayIterator<string>',
			'ArrayLike<string>',
			'AsyncGenerator<string>',
			'AsyncIterableIterator<string>',
			'AsyncIterator<string>',
			'AsyncIteratorObject<string>',
			'Generator<string>',
			'HeadersIterator<[string, string]>',
			'IterableIterator<string>',
			'IteratorObject<string>',
			'MapIterator<string>',
			'PromiseLike<string>',
			'ReadableStreamAsyncIterator<string>',
			'ReadonlySetLike<string>',
			'RegExpMatchArray',
			'RegExpStringIterator<string>',
			'SetIterator<string>',
			'StringIterator<string>',
			'URLSearchParamsIterator<[string, string]>',
		].map(type => typeAware(`function run(verbose = false, values?: ${type}) {}`)),
		...[
			['Iterator<string>', ['es2022']],
			['Map<string, string>', ['es5', 'es2015.iterable']],
			['Promise<string>', ['es5']],
			['Set<string>', ['es5', 'es2015.iterable']],
		].map(([type, libraries]) => {
			const code = `function run(verbose = false, values?: ${type}) {}`;
			const filename = path.resolve('file.ts').replaceAll('\\', '/');
			const compilerOptions = {lib: libraries.map(library => `lib.${library}.d.ts`), strict: true, types: []};
			const host = typescript.createCompilerHost(compilerOptions);
			const {getSourceFile} = host;
			host.getSourceFile = (name, languageVersion, ...arguments_) => name === filename
				? typescript.createSourceFile(name, code, languageVersion)
				: getSourceFile(name, languageVersion, ...arguments_);
			const program = typescript.createProgram([filename], compilerOptions, host);
			assert.deepEqual(typescript.getPreEmitDiagnostics(program, program.getSourceFile(filename)), []);
			return {code, filename, languageOptions: {parser: typescriptEslintParser, parserOptions: {programs: [program]}}};
		}),
	],
	invalid: [
		...[
			'interface Options { encoding?: string } function run(verbose = false, options?: Options) {}',
			'type Options = {encoding?: string}; type Alias = Options; function run(verbose = false, options?: Alias) {}',
			'function run(verbose = false, options?: {encoding?: string}) {}',
			'function run(verbose = false, options: {encoding?: string}) {}',
			'function run(verbose = false, options?: Record<string, unknown>) {}',
			'type Options = {encoding?: string} | {retries?: number}; function run(verbose = false, options?: Options) {}',
			'type Options = {encoding?: string} & {retries?: number}; function run(verbose = false, options?: Options) {}',
			'function run(verbose = false, options?: RequestInit) {}',
			'function getOptions() { return {encoding: "utf8"}; } function run(verbose = false, options = getOptions()) {}',
			'import type {CompilerOptions} from "typescript"; function run(verbose = false, options?: CompilerOptions) {}',
			'interface Options { encoding?: string } declare function run(verbose?: boolean, options?: Options): void;',
			'interface Options { encoding?: string } interface Runner { run(verbose?: boolean, options?: Options): void }',
			'function run(verbose = false, options: any = {}) {}',
		].map(code => typeAware(code)),
		{
			...typeAware('interface Options { encoding?: string } function run(verbose = false, options: Options) {}'),
			options: [],
		},
		...[
			'interface Options { encoding: string } function run(verbose = false, options?: Partial<Options>) {}',
			'interface Options<Value> { encoding?: Value } function run(verbose = false, options?: Options<string>) {}',
			'interface BaseOptions { encoding?: string } interface Options extends BaseOptions {} function run(verbose = false, options?: Options) {}',
		].map(code => typeAware(code)),
	],
});

test({
	valid: [
		'function clamp(value, minimum = 0, maximum = 1) {}',
		{code: 'declare function run(verbose?: boolean, retries?: number): void;', languageOptions: {parser: parsers.typescript}},
		{
			...typeAware('function run(verbose = false, values: Iterable<string>) {}'),
			options: [allOptionalParameters],
		},
	],
	invalid: [
		{
			code: 'function run(input, verbose = false, retries = 3) {}',
			options: [allOptionalParameters],
			errors: [{messageId: 'prefer-options-parameter', column: 21, endColumn: 36}],
		},
		{
			...typeAware('export {}; interface ReadonlySet { encoding?: string } function run(verbose = false, options?: ReadonlySet) {}'),
			errors: [{messageId: 'prefer-options-parameter'}],
		},
		{
			...typeAware('export {}; interface Iterator { encoding?: string } interface Options extends Iterator {} function run(verbose = false, options?: Options) {}'),
			errors: [{messageId: 'prefer-options-parameter'}],
		},
		{
			...typeAware('export {}; interface Array<Value> { value?: Value } interface Options extends Array<string> {} function run(verbose = false, options?: Options) {}'),
			errors: [{messageId: 'prefer-options-parameter'}],
		},
		{
			...typeAware('interface Options { next(): IteratorResult<string>; onError?: (error: Error) => void } function run(verbose = false, options?: Options) {}'),
			errors: [{messageId: 'prefer-options-parameter'}],
		},
		{
			...typeAware('function run(verbose = false, values?: Iterable<string>) {}'),
			options: [allOptionalParameters],
			errors: [{messageId: 'prefer-options-parameter'}],
		},
		{
			...typeAware('function run(verbose = false, values: ArrayLike<string> = {length: 0}) {}'),
			errors: [{messageId: 'prefer-options-parameter', column: 14, endColumn: 29}],
		},
	],
});

test.snapshot({
	valid: [
		...[
			'function run(verbose = false, options?: {}) {}',
			'function run(verbose = false, options?: {(): void; encoding?: string}) {}',
			'function run(verbose = false, options?: {new(): object; encoding?: string}) {}',
			'function run(verbose = false, options?: {encoding?: string}[]) {}',
			'function run(verbose = false, options?: () => {encoding?: string}) {}',
			'function run(verbose = false, options?: {encoding?: string} | boolean) {}',
			'type Options = {encoding?: string}; function run(verbose = false, options?: Options) {}',
			'function run(verbose = false, options?: undefined | undefined) {}',
			'function run(verbose = false, options?: {encoding?: string} | {}) {}',
			'function run(verbose = false, options?: {encoding?: string} | null) {}',
			'function run(verbose = false, options?: {encoding?: string} | string[]) {}',
			'function run(verbose = false, options?: {encoding?: string} | (() => void)) {}',
			'function run(verbose = false, options?: {encoding?: string} & undefined) {}',
			'function run(verbose = false, options?: {encoding?: string} & (() => void)) {}',
			'type Options = {encoding?: string}; function run(verbose = false, options?: Options | {retries?: number}) {}',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}, options: [existingOptionsOnly]})),
	],
	invalid: [
		...[
			'function run(verbose = false, options?: {encoding?: string}) {}',
			'function run(verbose = false, options?: {onError(error: Error): void}) {}',
			'function run(verbose = false, options?: {[key: string]: unknown}) {}',
			'function run(verbose = false, options?: {onError?: (error: Error) => void}) {}',
			'function run(verbose = false, options?: ({encoding?: string})) {}',
			'type Runner = (verbose?: boolean, options?: {encoding?: string}) => void;',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}, options: [existingOptionsOnly]})),
		{
			code: 'function run(verbose = false, options: {encoding?: string}) {}',
			languageOptions: {parser: parsers.typescript},
		},
		...[
			'function run(verbose = false, options?: {encoding?: string} | {retries?: number}) {}',
			'function run(verbose = false, options?: {encoding?: string} & {retries?: number}) {}',
			'function run(verbose = false, options?: {encoding?: string} | undefined) {}',
			'function run(verbose = false, options?: ({encoding?: string} | {retries?: number}) & {signal?: AbortSignal}) {}',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}, options: [existingOptionsOnly]})),
		{
			code: 'function run(verbose = false, options: {encoding?: string} | undefined) {}',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
