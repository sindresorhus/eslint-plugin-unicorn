import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			'/** @param {Map<string, number>} values */ function run(values) { return values.push(value); }',
			'/** @returns {Set<number>} */ function read() { return source; } function run() { return read().unshift(value); }',
			'/** @param {() => string} read */ function run(read) { return read().push(value); }',
			'/** @param {?Array<number>} stream */ function run(stream) { return stream.push(value); }',
			'/** @param {Array<number>} values */ function run(values) { return values.push(value).then(consume); }',
			'/** @param {Array<number>} values */ function run(values) { return void values.push(value); }',
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [
			...[
				[
					'/** @param {Array<number>} stream */ function run(stream) { return stream.push(value); }',
					'/** @param {Array<number>} stream */ function run(stream) { stream.push(value); return; }',
					'push',
				],
				[
					'/** @returns {ReadonlyArray<number>} */ function read() { return source; } function run() { return read().unshift(value); }',
					'/** @returns {ReadonlyArray<number>} */ function read() { return source; } function run() { read().unshift(value); return; }',
					'unshift',
				],
				[
					'/** @param {?Array<number>} values */ function run(values) { return values.push(value); }',
					'/** @param {?Array<number>} values */ function run(values) { values.push(value); return; }',
					'push',
				],
				[
					'/** @param {Uint8Array} values */ function run(values) { return values.push(value); }',
					'/** @param {Uint8Array} values */ function run(values) { values.push(value); return; }',
					'push',
				],
			].map(([code, output, method]) => ({
				code,
				filename: 'file.ts',
				errors: [{
					messageId: 'no-return-array-push/error',
					suggestions: [{messageId: 'no-return-array-push/suggestion', data: {method}, output}],
				}],
			})),
			...[
				'/** @param {Array<number>} values */ const run = values => values.push(value);',
				'/** @param {Array<number>} values */ function run(values) { return /* keep */ values.unshift(value); }',
			].map(code => ({code, filename: 'file.ts', errors: [{messageId: 'no-return-array-push/error', suggestions: 0}]})),
		],
	});
}

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [{
			code: '/** @param {Array<number>} values */ function run(values: Set<number>) { return values.push(value); }',
			filename: 'file.ts',
		}],
		invalid: [{
			code: '/** @param {Map<string, number>} stream */ function run(stream: number[]) { return stream.push(value); }',
			filename: 'file.ts',
			errors: [{
				messageId: 'no-return-array-push/error',
				suggestions: [{
					messageId: 'no-return-array-push/suggestion',
					data: {method: 'push'},
					output: '/** @param {Map<string, number>} stream */ function run(stream: number[]) { stream.push(value); return; }',
				}],
			}],
		}],
	});
}

test.snapshot({
	valid: [
		outdent`
			function foo() {
				array.push(value);
				return;
			}
		`,
		outdent`
			function foo() {
				array.unshift(value);
				return;
			}
		`,
		outdent`
			function foo() {
				return array.length + 1;
			}
		`,
		outdent`
			function foo() {
				return array.push();
			}
		`,
		outdent`
			function foo() {
				return array.unshift();
			}
		`,
		outdent`
			function foo() {
				return stream.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return this.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return this.stream.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return process.stdin.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return process.stdout.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return process.stderr.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return router.push(to);
			}
		`,
		outdent`
			function foo() {
				return this.router.push(to);
			}
		`,
		outdent`
			function foo() {
				return this.$router.push(to);
			}
		`,
		outdent`
			function foo() {
				return stream?.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return this?.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return process.stdin?.push(chunk);
			}
		`,
		outdent`
			function foo() {
				return array['push'](value);
			}
		`,
		outdent`
			function foo() {
				return array['unshift'](value);
			}
		`,
		outdent`
			function foo() {
				return array[push](value);
			}
		`,
		outdent`
			function foo() {
				return array[unshift](value);
			}
		`,
		outdent`
			function foo() {
				return push(value);
			}
		`,
		outdent`
			function foo() {
				return unshift(value);
			}
		`,
		outdent`
			function foo() {
				array?.push(value);
			}
		`,
		outdent`
			function foo() {
				array?.unshift(value);
			}
		`,
		'void array.push(value);',
		'void array.unshift(value);',
		'void array?.push(value);',
		'void array?.unshift(value);',
		'const length = void array.push(value);',
		'const foo = value => void array.push(value);',
		outdent`
			function foo() {
				return void array.push(value);
			}
		`,
		// Chained result -> likely a custom API, such as a `Promise`-returning `push()`.
		outdent`
			function foo() {
				return router.push(to).catch(() => {});
			}
		`,
		outdent`
			function foo() {
				return router.push(to).then(onFulfilled);
			}
		`,
		'const promise = router.push(to).finally(cleanup);',
		outdent`
			function foo() {
				return array.push(value).toString();
			}
		`,
		outdent`
			function foo() {
				return array.unshift(value).foo;
			}
		`,
		outdent`
			function foo() {
				return router.push(to)?.catch(() => {});
			}
		`,
		// Computed member access on the result is treated as the same custom API signal.
		'array.push(value)[0];',
	],
	invalid: [
		'const length = array.push(value);',
		'const length = routerItems.push(value);',
		'const length = array.unshift(value);',
		'const length = stream.unshift(chunk);',
		'console.log(array.push(value));',
		'console.log(array.unshift(value));',
		'const length = await array.push(value);',
		'const length = await array.unshift(value);',
		'async function foo() { await array.push(value); }',
		'async function foo() { await array.unshift(value); }',
		'(array.push(value), sideEffect());',
		'(array.unshift(value), sideEffect());',
		'(sideEffect(), array.push(value));',
		'(sideEffect(), array.unshift(value));',
		'condition && array.push(value);',
		'condition && array.unshift(value);',
		'array.push(value) && sideEffect();',
		'array.unshift(value) && sideEffect();',
		'condition || array.push(value);',
		'condition || array.unshift(value);',
		'array.push(value) || sideEffect();',
		'array.unshift(value) || sideEffect();',
		'condition ?? array.push(value);',
		'condition ?? array.unshift(value);',
		'array.push(value) ?? sideEffect();',
		'array.unshift(value) ?? sideEffect();',
		'condition ? array.push(value) : sideEffect();',
		'condition ? array.unshift(value) : sideEffect();',
		'condition ? sideEffect() : array.push(value);',
		'condition ? sideEffect() : array.unshift(value);',
		'array.push(value) ? sideEffect() : other();',
		'array.unshift(value) ? sideEffect() : other();',
		'for (array.push(value); condition; ) {}',
		'for (; array.push(value); ) {}',
		'for (; condition; array.unshift(value)) {}',
		'for (; array.unshift(value); ) {}',
		outdent`
			function foo() {
				return array.push(value);
			}
		`,
		outdent`
			function foo() {
				return array.unshift(value);
			}
		`,
		outdent`
			function foo() {
				return (array.push(value));
			}
		`,
		outdent`
			function foo() {
				return (array.unshift(value));
			}
		`,
		outdent`
			function foo() {
				return array?.push(value);
			}
		`,
		outdent`
			function foo() {
				return array?.unshift(value);
			}
		`,
		outdent`
			function foo() {
				return array.push?.(value);
			}
		`,
		outdent`
			function foo() {
				return array.unshift?.(value);
			}
		`,
		outdent`
			async function foo() {
				return await array.push(value);
			}
		`,
		outdent`
			async function foo() {
				return await array.unshift(value);
			}
		`,
		'const foo = value => array.push(value);',
		'const foo = value => array.unshift(value);',
		outdent`
			const foo = async value => array.push(await value);
		`,
		outdent`
			const foo = async value => array.unshift(await value);
		`,
		outdent`
			function foo() {
				return /* comment */ array.push(value);
			}
		`,
		outdent`
			function foo() {
				return /* comment */ array.unshift(value);
			}
		`,
		outdent`
			function foo() {
				return array.push(/* comment */ value);
			}
		`,
		outdent`
			function foo() {
				return array.unshift(/* comment */ value);
			}
		`,
		outdent`
			function foo() {
				if (condition) return array.push(value);
			}
		`,
		outdent`
			function foo() {
				if (condition) return array.unshift(value);
			}
		`,
		outdent`
			function foo() {
				return condition && array.push(value);
			}
		`,
		outdent`
			function foo() {
				return condition && array.unshift(value);
			}
		`,
		outdent`
			function foo() {
				return condition ? array.push(value) : value;
			}
		`,
		outdent`
			function foo() {
				return condition ? array.unshift(value) : value;
			}
		`,
		outdent`
			function foo() {
				return condition ? value : array.push(value);
			}
		`,
		outdent`
			function foo() {
				return condition ? value : array.unshift(value);
			}
		`,
		outdent`
			function foo() {
				return (sideEffect(), array.push(value));
			}
		`,
		outdent`
			function foo() {
				return (sideEffect(), array.unshift(value));
			}
		`,
		outdent`
			function foo() {
				foo()
				return [array].push(value);
			}
		`,
		outdent`
			function foo() {
				foo()
				return [array].unshift(value);
			}
		`,
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'array.push(value) as number;',
		'array.unshift(value) as number;',
		'<number>array.push(value);',
		'<number>array.unshift(value);',
		'array.push(value)!;',
		'array.unshift(value)!;',
		'array.push(value) satisfies number;',
		'array.unshift(value) satisfies number;',
		'void (array.push(value) as number);',
		'void (array.unshift(value) as number);',
		'const onClick = () => router.push(`/${region}/customers/${String(result.data)}` as Route);', // eslint-disable-line no-template-curly-in-string
		outdent`
			function foo() {
				return (array.push(value) as Foo).bar;
			}
		`,
		// Syntax-only annotation proves the receiver is not an array.
		outdent`
			interface Router {
				push(to: string): Promise<void>;
			}

			function foo(router: Router) {
				return router.push(to);
			}
		`,
		outdent`
			class Queue {
				unshift(value: unknown) {
					return value;
				}
			}

			function foo(queue: Queue) {
				return queue.unshift(value);
			}
		`,
	],
	invalid: [
		'const foo = (value: string) => array.push(value);',
		'const foo = (value: string) => array.unshift(value);',
		outdent`
			function foo() {
				return array.push(value) as number;
			}
		`,
		outdent`
			function foo() {
				return array.unshift(value) as number;
			}
		`,
		outdent`
			function foo() {
				return <number>array.push(value);
			}
		`,
		outdent`
			function foo() {
				return <number>array.unshift(value);
			}
		`,
		outdent`
			function foo() {
				return array.push(value)!;
			}
		`,
		outdent`
			function foo() {
				return array.unshift(value)!;
			}
		`,
		outdent`
			function foo() {
				return array.push(value) satisfies number;
			}
		`,
		outdent`
			function foo() {
				return array.unshift(value) satisfies number;
			}
		`,
		'const foo = (value: string) => array.push(value) satisfies number;',
		'const foo = (value: string) => array.unshift(value) satisfies number;',
	],
});

// Full type information proves the receiver is not an array
const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		typeAware('declare const router: {push(to: string): Promise<void>}; function foo() { return router.push(to); }'),
		typeAware('function foo(navigation: {push(to: string): Promise<void>}) { return navigation.push(to); }'),
		typeAware('declare const queue: {unshift(value: unknown): number}; function foo() { return queue.unshift(value); }'),
	],
	invalid: [
		typeAware('declare const array: number[]; function foo() { return array.push(value); }'),
		typeAware('function foo(stream: string[]) { return stream.push(value); }'),
		typeAware('function foo(this: string[]) { return this.push(value); }'),
		typeAware('function foo(router: string[]) { return router.push(value); }'),
		typeAware('function foo(this: {router: string[]}) { return this.router.push(value); }'),
		typeAware('function foo(this: {$router: string[]}) { return this.$router.push(value); }'),
		typeAware('function foo(this: {stream: string[]}) { return this.stream.push(value); }'),
		typeAware('declare const process: {stdin: string[]}; function foo() { return process.stdin.push(value); }'),
		typeAware('declare const process: {stdout: string[]}; function foo() { return process.stdout.push(value); }'),
		typeAware('declare const process: {stderr: string[]}; function foo() { return process.stderr.push(value); }'),
	],
});

// A receiver can start with a token forbidden at the start of a statement.
test({
	valid: [],
	invalid: ['push', 'unshift'].flatMap(method => [
		`function run() { return function () { return []; }().${method}(1); }`,
		`function run() { return (function () { return []; }().${method}(1)); }`,
	].map(code => ({
		code,
		errors: [{
			messageId: 'no-return-array-push/error',
			suggestions: [{
				messageId: 'no-return-array-push/suggestion',
				output: `function run() { (function () { return []; }().${method}(1)); return; }`,
			}],
		}],
	}))),
});

test({
	valid: [],
	invalid: [
		{
			code: 'function run() { setup()\nreturn function () { return []; }().push(1); }',
			errors: [{
				messageId: 'no-return-array-push/error',
				suggestions: [{messageId: 'no-return-array-push/suggestion', output: 'function run() { setup()\n;(function () { return []; }().push(1)); return; }'}],
			}],
		},
		{
			code: 'function run() { return function () { return []; }().push(/* keep */ 1); }',
			errors: [{
				messageId: 'no-return-array-push/error',
				suggestions: [{messageId: 'no-return-array-push/suggestion', output: 'function run() { (function () { return []; }().push(/* keep */ 1)); return; }'}],
			}],
		},
		{
			code: 'function run() { return function () { return []; }()!.push(1); }',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'no-return-array-push/error',
				suggestions: [{messageId: 'no-return-array-push/suggestion', output: 'function run() { (function () { return []; }()!.push(1)); return; }'}],
			}],
		},
	],
});

nodeTest('separating return keeps an IIFE receiver as an expression', t => {
	const linter = new Linter();
	const config = {plugins: {unicorn: {rules: {'no-return-array-push': rule}}}, rules: {'unicorn/no-return-array-push': 'error'}};
	const code = 'const array = []; function run() { return function () { return array; }().push(1); } run(); array.join();';
	const [message] = linter.verify(code, config);
	const {range, text} = message.suggestions[0].fix;
	const output = code.slice(0, range[0]) + text + code.slice(range[1]);
	t.assert.deepStrictEqual(linter.verify(output, config), []);
	t.assert.strictEqual(runInNewContext(output), runInNewContext(code));
});
