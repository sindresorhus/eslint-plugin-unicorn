import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);
const existingOptionsOnly = {checkWithoutOptionsObject: false};

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
		...[
			'function run(input, verbose = false, retries = 3) {}',
			'function run(input, settings = {}, verbose = false) {}',
			'function run(verbose = false, values = []) {}',
			'function run(verbose = false, callback = () => {}) {}',
			'function run(verbose = false, date = new Date()) {}',
			'function run(verbose = false, options = getOptions()) {}',
			'function run(verbose = false, options = undefined) {}',
			'function run(verbose = false, options = null) {}',
			'function run(verbose = false, options) {}',
			'let defaults = {}; defaults = []; function run(verbose = false, options = defaults) {}',
		].map(code => ({code, options: [existingOptionsOnly]})),
		{code: 'function run(input: string, verbose?: boolean) {}', languageOptions: {parser: parsers.typescript}},
		{code: 'function run(verbose = false, options?: Options) {}', languageOptions: {parser: parsers.typescript}, options: [existingOptionsOnly]},
		{code: 'class Runner { constructor(public verbose = false, retries = 3) {} }', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
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
		{
			code: 'const component = <Button onClick={(verbose = false, retries = 3) => null} />;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
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
		outdent`
			function updateSelection(
				graph,
				modules,
				transform = null,
				shouldScrollToSelected = true,
			) {}
		`,
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
			'function run(verbose = false, options = {} as Options) {}',
			'function run(verbose = false, options = {} satisfies Options) {}',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
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
			'class Options { encoding = "utf8" } function run(verbose = false, options?: Options) {}',
			'class Options<Value> { encoding?: Value } function run(verbose = false, options?: Options<string>) {}',
			'abstract class Options { encoding?: string } function run(verbose = false, options?: Options) {}',
			'class Options { private constructor() {} encoding?: string } function run(verbose = false, options?: Options) {}',
			'interface Options { (): void; encoding?: string } function run(verbose = false, options?: Options) {}',
			'interface Options { new (): object; encoding?: string } function run(verbose = false, options?: Options) {}',
			'type Options = {encoding?: string} | boolean; function run(verbose = false, options?: Options) {}',
			'type Options = {encoding?: string} | null; function run(verbose = false, options?: Options) {}',
			'type Options = {encoding?: string} & Date; function run(verbose = false, options?: Options) {}',
			'type Options = {encoding?: string} | undefined; function run(options?: Options) {}',
			'function run<Value>(verbose = false, options?: Value) {}',
			'function run(options?: {encoding?: string}) {}',
			'function run(first: number | undefined, options?: {encoding?: string}) {}',
			'function run(verbose = false, options?: {encoding?: string}, ...rest: unknown[]) {}',
		].map(code => typeAware(code)),
	],
	invalid: [
		...[
			'interface Options { encoding?: string } function run(verbose = false, options?: Options) {}',
			'type Options = {encoding?: string}; type Alias = Options; function run(verbose = false, options?: Alias) {}',
			'function run(verbose = false, options?: {encoding?: string}) {}',
			'function run(verbose = false, options: {encoding?: string}) {}',
			'function run(verbose = false, options?: Record<string, unknown>) {}',
			'function run(verbose = false, options?: {encoding?: string} | {retries?: number}) {}',
			'function run(verbose = false, options?: {encoding?: string} & {retries?: number}) {}',
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
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'function run(input, verbose = false, retries = 3) {}',
			errors: [{messageId: 'prefer-options-parameter', column: 21, endColumn: 36}],
		},
	],
});
