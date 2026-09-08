/* eslint-disable no-template-curly-in-string */
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(transform(element));
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(element);
				foo();
			}
		`,
		outdent`
			const result = [];
			// Keep this comment.
			for await (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [existing];
			for await (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				other.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(element, other);
			}
		`,
		outdent`
			async function foo(Array) {
				const result = [];
				for await (const element of iterable) {
					result.push(element);
				}
			}
		`,
		outdent`
			const result = [];
			for await (const element of getIterable(result)) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(await transform(result, element));
			}
		`,
		outdent`
			const result = [];
			for await (const result of iterable) {
				result.push(result);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(
					// Keep this comment.
					element,
				);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(await transform(element++));
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(await transform(element = value));
			}
		`,
		outdent`
			await using result = [];
			for await (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			using result = [];
			for await (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (await using element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (using element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			var result = [];
			for await (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (var element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (const [key, value] of iterable) {
				result.push(await transform(key, value));
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result?.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push?.(element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result['push'](element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.unshift(element);
			}
		`,
		outdent`
			const result = [];
			for (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(await transform(await getValue(element)));
			}
		`,
	],
	invalid: [
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			let result = [];
			for await (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (let element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of (iterable)) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(await transform(element));
			}
		`,
		outdent`
			const result = [];
			for await (let element of iterable) {
				result.push(await transform(element++));
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(await element);
			}
		`,
		{
			code: outdent`
				const result: string[] = [];
				for await (const element of iterable) {
					result.push(element);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(await ({value: element}));
			}
		`,
		// A sequence expression mapper body must be parenthesized in the arrow function
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(await (log(element), element));
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable)
				result.push(element);
		`,
		// A TypeScript `as` mapper body must be parenthesized in the arrow function.
		// Wrapped in an `async function` so `await` is a keyword via syntax, independent of `sourceType`, which the TypeScript parser does not honor consistently across environments.
		{
			code: outdent`
				async function foo() {
					const result = [];
					for await (const element of iterable) {
						result.push(await (element as string));
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
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
		'const result = []; for (const path of paths) { result.push(await readFile(path)); }',
		'const paths = [Promise.resolve("a")]; const result = []; for (const path of paths) { result.push(await readFile(path)); }',
		'const result = []; for (const path of [{then(resolve) { resolve("a"); }}]) { result.push(await readFile(path)); }',
		'const result = []; for (const path of [unknown]) { result.push(await readFile(path)); }',
		'const paths = ["a"]; paths.push(Promise.resolve("b")); const result = []; for (const path of paths) { result.push(await readFile(path)); }',
		'const paths = ["a"]; paths[0] = Promise.resolve("b"); const result = []; for (const path of paths) { result.push(await readFile(path)); }',
		'const paths = ["a"]; mutate(paths); const result = []; for (const path of paths) { result.push(await readFile(path)); }',
		'const paths = ["a"]; const alias = paths; alias.push(Promise.resolve("b")); const result = []; for (const path of paths) { result.push(await readFile(path)); }',
		'let paths = ["a"]; paths = promises; const result = []; for (const path of paths) { result.push(await readFile(path)); }',
		'const result = []; for (const path of ["a"]) { result.push(readFile(path)); }',
		'const result = []; for (const path of ["a"]) { result.push(path); }',
		'const result = []; for (const path of ["a"]) { result.push(await readFile(await normalize(path))); }',
		'const result = []; for (const path of ["a"]) { result.push(await readFile(path, result)); }',
		'const result = []; for (const path of ["a"]) { result.push(await readFile(path)); log(path); }',
		'const result = []; for (const path of ["a"]) { result.push(await readFile(/* keep */ path)); }',
		'const result = []; /* keep */ for (const path of ["a"]) { result.push(await readFile(path)); }',
		'const result = await Promise.all(paths.map(path => readFile(path)));',
		'const paths = ["a"]; const result = []; for (const path of [...paths]) { result.push(await readFile(path)); }',
		'const result = []; for (const value of [{}]) { result.push(await transform(value)); }',
		'let path = "a"; const result = []; for (const value of [path]) { result.push(await readFile(value)); }',
		'const object = {path: "a"}; object.path = Promise.resolve("b"); const result = []; for (const path of [object.path]) { result.push(await readFile(path)); }',
		{
			code: 'async function foo(paths: string[]) { const result = []; for (const path of paths) { result.push(await readFile(path)); } }',
			languageOptions: {parser: parsers.typescript},
		},
		...[
			'any',
			'any[]',
			'unknown[]',
			'object[]',
			'Promise<string>[]',
			'PromiseLike<string>[]',
			'[string, Promise<string>]',
			'(string | Promise<string>)[]',
			'{then: (resolve: (value: string) => void) => void}[]',
			'Iterable<string>',
			'AsyncIterable<string>',
			'Set<string>',
		].map(type => typeAware(`async function foo(paths: ${type}) { const result = []; for (const path of paths) { result.push(await readFile(path)); } }`)),
		typeAware('async function foo<T extends unknown>(paths: T[]) { const result = []; for (const path of paths) { result.push(await readFile(path)); } }'),
		typeAware('async function foo<T extends string | PromiseLike<string>>(paths: T[]) { const result = []; for (const path of paths) { result.push(await readFile(path)); } }'),
		typeAware(outdent`
			function replace(values: unknown[]) {
				values[0] = Promise.resolve('b');
			}
			async function foo() {
				const paths = ['a'];
				replace(paths);
				const result = [];
				for (const path of paths) {
					result.push(await transform(path));
				}
			}
		`),
	],
	invalid: [
		'const result = []; for (const path of ["a", "b"]) { result.push(await readFile(path)); }',
		'const paths = ["a", "b"]; const result = []; for (const path of paths) { result.push(await readFile(path)); }',
		'const paths = "ab"; const result = []; for (const path of paths) { result.push(await readFile(path)); }',
		'const path = "a"; const result = []; for (const value of [path]) { result.push(await readFile(value)); }',
		'let result = []; for (let value of [1, true, null, undefined, 1n]) { result.push(await transform(value)); }',
		'const result = []; for (const path of ((["a"]))) result.push(await reader.readFile(path));',
		'const result = []; for (const value of "abc") { result.push(await ({value})); }',
		{
			code: 'async function foo() { const result: string[] = []; for (const path of (["a"] as const)) { result.push(await (readFile(path) as string)); } }',
			languageOptions: {parser: parsers.typescript},
		},
		...[
			'string',
			'string[]',
			'Array<string>',
			'readonly string[]',
			'ReadonlyArray<string>',
			'[string, number]',
			'readonly [string, number?]',
			'(string | number | boolean | bigint | symbol | null | undefined)[]',
			'string[] | number[]',
			'("a" | 1 | true)[]',
			'`file-${string}`',
			'`file-${string}`[]',
		].map(type => typeAware(`async function foo(paths: ${type}) { const result = []; for (const path of paths) { result.push(await readFile(path)); } }`)),
		typeAware('async function foo<T extends string>(paths: Uppercase<T>) { const result = []; for (const path of paths) { result.push(await readFile(path)); } }'),
		typeAware('async function foo<T extends string>(paths: Uppercase<T>[]) { const result = []; for (const path of paths) { result.push(await readFile(path)); } }'),
		typeAware('async function foo<T extends string>(paths: T) { const result = []; for (const path of paths) { result.push(await readFile(path)); } }'),
		typeAware('async function foo<T extends readonly string[]>(paths: T) { const result = []; for (const path of paths) { result.push(await readFile(path)); } }'),
		typeAware('async function foo<T extends string>(paths: Array<T>) { const result = []; for (const path of paths) { result.push(await readFile(path)); } }'),
		typeAware('declare const key: unique symbol; async function foo(keys: (typeof key)[]) { const result = []; for (const key of keys) { result.push(await transform(key)); } }'),
		{
			code: 'async function foo() { const result = []; for (const path of [("a" as string)]) { result.push(await readFile(path)); } }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('async function foo(paths: string[] | undefined) { const result = []; for (const path of paths!) { result.push(await readFile(path)); } }'),
		typeAware('async function foo(paths: string[]) { const result = []; for (const path of (paths satisfies readonly string[])) { result.push(await readFile(path)); } }'),
	],
});

// Ordinary loops invoke the first mapper before yielding, so converting them can change reads of shared state.
test({
	valid: [],
	invalid: [
		{
			code: outdent`
				let prefix = 'old';
				async function collect() {
					const result = [];
					for (const path of ['a']) {
						result.push(await (prefix + path));
					}
					return result;
				}
				const pending = collect();
				prefix = 'new';
			`,
			errors: [{
				messageId: 'prefer-array-from-async',
				suggestions: [{
					messageId: 'prefer-array-from-async/suggestion',
					output: outdent`
						let prefix = 'old';
						async function collect() {
							const result = await Array.fromAsync(['a'], path => prefix + path);
							return result;
						}
						const pending = collect();
						prefix = 'new';
					`,
				}],
			}],
		},
	],
});

// Destructuring assignments need parentheses when moved into a concise arrow body.
test.snapshot({
	valid: [],
	invalid: [
		'let length; const result = []; for (const element of ["a"]) { result.push(await ({length} = element)); }',
		'let length; const result = []; for await (const element of iterable) { result.push(await ({length} = element)); }',
	],
});
