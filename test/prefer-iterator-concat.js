import nodeTest from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

const linter = new Linter();

// Minimal lazy `Iterator.concat()` for Node.js versions without it
const Iterator = {
	* concat(...iterables) {
		for (const iterable of iterables) {
			yield * iterable;
		}
	},
};

// `Iterator.concat()` evaluates every argument before consuming any iterable, so a later argument can change an earlier iterable before it is read. That is why conversions with a later argument that has a side effect are suggestions.
nodeTest('iterator concatenation changes when later arguments are evaluated', t => {
	const code = 'const first = [1]; function second() { first[0] = 2; return []; } JSON.stringify(Array.from([...first, ...second()]));';
	const [problem] = linter.verify(code, {
		plugins: {unicorn: {rules: {'prefer-iterator-concat': rule}}},
		rules: {'unicorn/prefer-iterator-concat': 'error'},
	});
	const {fix} = problem.suggestions[0];
	const suggestion = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	t.assert.strictEqual(runInNewContext(code), '[1]');
	t.assert.strictEqual(runInNewContext(suggestion, {Iterator}), '[2]');
});

nodeTest('iterator concatenation is autofixed when the consumer only stores the values', t => {
	for (const consumer of ['[...new Set(VALUES)]', 'Array.from(VALUES)', '[...Uint8Array.from(VALUES)]', '[...new Uint8Array(VALUES)]']) {
		const code = outdent`
			const calls = [];
			const second = new Set([3, 4]);
			function* first() { calls.push("first1"); yield 1; calls.push("first2"); yield 2; }
			const result = ${consumer.replace('VALUES', '[...first(), ...second]')};
			JSON.stringify({calls, result});
		`;
		const {output, fixed, messages} = linter.verifyAndFix(code, {
			plugins: {unicorn: {rules: {'prefer-iterator-concat': rule}}},
			rules: {'unicorn/prefer-iterator-concat': 'error'},
		});
		t.assert.strictEqual(fixed, true, code);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(output, code.replace('[...first(), ...second]', 'Iterator.concat(first(), second)'));
		t.assert.strictEqual(runInNewContext(output, {Iterator}), runInNewContext(code), code);
	}
});

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
		// Not a temporary spread array.
		'new Set(foo)',
		'new Set([...foo])',
		'Iterator.concat(foo, bar)',

		// Mixed arrays are intentionally unsupported.
		'new Set([foo, ...bar])',
		'new Set([...foo, bar])',
		'new Set([, ...foo, ...bar])',

		// Comments inside unrelated arrays are ignored.
		'const values = [/* comment */ ...foo, ...bar]',

		// `prefer-set-methods` handles or intentionally ignores known Set unions.
		'new Set([...iterator.toArray(), ...other])',
		'const a = new Set(); const b = new Set(); new Set([...a, ...b])',
		'const a = new Set(); const b = new Set(); new Set([...(condition ? a : a), ...b])',
		'const a = new Set(); new Set([...a, ...new Set((a.clear(), []))])',
		'const a = new Set(); const b = new Set(); new Set([/* comment */ ...a, ...b])',
		'[...[...foo, ...bar]]',
		'call(...[...foo, ...bar])',
		'call(value, ...[...foo, ...bar])',
		'new Foo(...[...foo, ...bar])',

		// Non-matching constructors.
		'new Foo([...foo, ...bar])',
		'new foo.Set([...foo, ...bar])',
		'new Map([...foo, ...bar], extra)',
		'new Uint8Array([...foo, ...bar], byteOffset)',

		// Non-matching calls.
		'foo([...bar, ...baz])',
		'Array.of([...foo, ...bar])',
		'Array.from?.([...foo, ...bar])',
		'Array?.from([...foo, ...bar])',
		'Array["from"]([...foo, ...bar])',
		'Object.fromEntries([...foo, ...bar], extra)',
		'Promise.all([...foo, ...bar], extra)',

		// Not direct iterable accepting usage.
		'const values = [...foo, ...bar]',
		'for (const key in [...foo, ...bar]);',
		'function foo() { return [...foo, ...bar] }',

		// `Iterator.concat()` requires every argument to be an object. Spreading a string primitive works, passing the string itself throws.
		'const a = "ae", b = "xy"; new Set([...a, ...b]);',
		'new Set([..."ae", ..."xy"]);',
		'new Set([...`ae`, ...`xy`]);',
		'Array.from([...a, ...b]); const a = "ae", b = "xy";',
		// One string among the spreads is enough
		'new Set([...a, ...b]); const a = "ae", b = [1];',
		'Array.from([...String(value), ...values]);',
		{
			code: 'function collect(text: string, values: string[]) { return Array.from([...text, ...values]); }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware(outdent`
			declare function getText(): ReturnType<() => string>;
			const text = getText();
			Array.from([...text, ...values]);
		`),
	],
	invalid: [
		// Constructors that accept iterables.
		'new Set([...foo, ...bar])',
		'new Map([...foo, ...bar])',
		'new WeakSet([...foo, ...bar])',
		'new WeakMap([...foo, ...bar])',
		'new Int8Array([...foo, ...bar])',
		'new Uint8Array([...foo, ...bar])',
		'new Float64Array([...foo, ...bar])',

		// Static methods that accept iterables.
		'Array.from([...foo, ...bar])',
		'Array.from([...foo, ...bar], )',
		'Array.from([...foo, ...bar], mapFunction)',
		'Array.from([...foo, ...bar], mapFunction, thisArgument)',
		'Array.from([...foo, ...bar], mapFunction, thisArgument, extra)',
		'Array.from([...foo, ...throwsOnIteration], mapFunction)',
		'Object.fromEntries([...foo, ...bar])',
		'Uint8Array.from([...foo, ...bar])',
		'Uint8Array.from([...foo, ...bar], mapFunction)',

		// Promise methods are suggestions only.
		'Promise.all([...foo, ...bar])',
		'Promise.allSettled([...foo, ...bar])',
		'Promise.any([...foo, ...bar])',
		'Promise.race([...foo, ...bar])',

		// For-of.
		'for (const value of [...foo, ...bar]);',
		'for (const value of[...foo, ...bar]);',
		'async () => { for await (const value of [...foo, ...bar]); }',

		// Yield star.
		outdent`
			function * foo() {
				yield * [...bar, ...baz];
			}
		`,

		// Parentheses and formatting.
		'new Set([...(foo ? bar : baz), ...(qux)])',
		'new Set((([...foo, ...bar])))',
		outdent`
			new Set([
				...foo,
				...bar,
			])
		`,

		'Array.from([...(first, foo), ...(second, bar)])',
		{
			code: 'const result = <div>{Array.from([...foo, ...bar])}</div>;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		'for(const value of([...foo, ...bar])) {}',
		'function * collect() { yield*([...foo, ...bar]); }',
		{
			code: 'Array.from([...(foo as number[]), ...(bar satisfies number[])]);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'new Set([...foo!, ...(<number[]>bar)]);',
			languageOptions: {parser: parsers.typescript},
		},

		// A later argument with a side effect runs before earlier iterables are consumed, so it is a suggestion
		'new Set([...foo, ...bar()])',
		'Array.from([...foo, ...(bar = baz)])',
		'new Map([...foo, ...tag`bar`])',
		// The first argument runs first either way
		'new Set([...foo(), ...bar])',

		// Comments are reported without a suggestion.
		'new Set([/* comment */ ...foo, ...bar])',
		'Promise.all([/* comment */ ...foo, ...bar])',

		// A spread that is not a string is still reported
		'const a = [1], b = [2]; new Set([...a, ...b]);',
		'Array.from([...[1], ...[2]]);',
		{
			code: 'function collect(text: String, values: string[]) { return Array.from([...text, ...values]); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
