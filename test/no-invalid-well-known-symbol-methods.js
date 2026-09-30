import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {
			projectService: {
				allowDefaultProject: ['*.ts'],
			},
		},
	},
});

test.snapshot({
	valid: [
		outdent`
			class Resource {
				[Symbol.dispose]() {}
			}
		`,
		outdent`
			class Resource {
				async [Symbol.asyncDispose]() {}
			}
		`,
		outdent`
			class Iterable {
				*[Symbol.iterator]() {
					yield value;
				}
			}
		`,
		outdent`
			class AsyncIterable {
				async *[Symbol.asyncIterator]() {
					yield value;
				}
			}
		`,
		outdent`
			const object = {
				[Symbol.dispose]() {},
				async [Symbol.asyncDispose]() {},
				*[Symbol.iterator]() {
					yield value;
				},
				async *[Symbol.asyncIterator]() {
					yield value;
				},
			};
		`,
		outdent`
			const object = {
				[Symbol.dispose]: function () {},
				[Symbol.asyncDispose]: async function () {},
				[Symbol.iterator]: function * () {
					yield value;
				},
				[Symbol.asyncIterator]: function () {
					return asyncIterator;
				},
				[Symbol.asyncIterator]: async function * () {
					yield value;
				},
			};
		`,
		outdent`
			class Resource {
				static [Symbol.dispose]() {}
			}
		`,
		outdent`
			class Resource {
				get [Symbol.dispose]() {
					return dispose;
				}
			}
		`,
		outdent`
			class Resource {
				async [symbol.dispose]() {}
			}
		`,
		outdent`
			class Resource {
				async ['Symbol.dispose']() {}
			}
		`,
		outdent`
			class Resource {
				async dispose() {}
			}
		`,
		{
			code: outdent`
				class Resource {
					[Symbol.dispose](): void {}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				declare class Resource {
					[Symbol.dispose](): Promise<void>;
					[Symbol.iterator](): Promise<Iterator<unknown>>;
					[Symbol.asyncIterator](): Promise<AsyncIterator<unknown>>;
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				interface Resource {
					[Symbol.dispose](): Promise<void>;
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		outdent`
			class Resource {
				async [Symbol.dispose]() {}
			}

			using resource = new Resource();
		`,
		{
			code: outdent`
				class Resource {
					[Symbol.dispose](): PromiseLike<void> {
						return promise;
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				class Resource {
					[Symbol.dispose](): Promise<void> | void {
						return Promise.resolve();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			const object = {
				async [Symbol.dispose]() {},
			};
		`,
		outdent`
			const object = {
				[Symbol.dispose]: async function () {},
			};
		`,
		outdent`
			const object = {
				[Symbol.dispose]: async () => {},
			};
		`,
		outdent`
			class Resource {
				static async [Symbol.dispose]() {}
			}
		`,
		outdent`
			class Resource {
				[Symbol.dispose] = async function () {};
			}
		`,
		outdent`
			class Resource {
				*[Symbol.dispose]() {
					yield value;
				}
			}
		`,
		outdent`
			class Resource {
				async *[Symbol.dispose]() {
					yield value;
				}
			}
		`,
		outdent`
			class Iterable {
				async [Symbol.iterator]() {
					return iterator;
				}
			}
		`,
		outdent`
			class Iterable {
				async *[Symbol.iterator]() {
					yield value;
				}
			}
		`,
		outdent`
			const iterable = {
				async [Symbol.iterator]() {
					return iterator;
				},
			};
		`,
		outdent`
			const iterable = {
				[Symbol.iterator]: async function () {
					return iterator;
				},
			};
		`,
		outdent`
			const iterable = {
				[Symbol.iterator]: async () => iterator,
			};
		`,
		{
			code: outdent`
				class Iterable {
					[Symbol.iterator](): Promise<Iterator<unknown>> {
						return Promise.resolve(iterator);
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			class AsyncIterable {
				async [Symbol.asyncIterator]() {
					return iterator;
				}
			}
		`,
		outdent`
			const asyncIterable = {
				async [Symbol.asyncIterator]() {
					return iterator;
				},
			};
		`,
		outdent`
			const asyncIterable = {
				[Symbol.asyncIterator]: async () => iterator,
			};
		`,
		outdent`
			class AsyncIterable {
				[Symbol.asyncIterator] = async () => iterator;
			}
		`,
		{
			code: outdent`
				class AsyncIterable {
					[Symbol.asyncIterator](): Promise<AsyncIterator<unknown>> {
						return Promise.resolve(asyncIterator);
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				class Resource {
					[Symbol.dispose](): Promise<void> {
						return Promise.resolve();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		typeAware(outdent`
			type DisposeResult = Promise<void>;
			type IteratorPromise = Promise<Iterator<unknown>>;
			type AsyncIteratorResult = Promise<AsyncIterator<unknown>>;

			class ResourceFromInference {
				[Symbol.dispose]() {
					return Promise.resolve();
				}
			}

			class ResourceFromAlias {
				[Symbol.dispose](): DisposeResult {
					return Promise.resolve();
				}
			}

			class Iterable {
				[Symbol.iterator](): IteratorPromise {
					return Promise.resolve(iterator);
				}
			}

			class AsyncIterableFromInference {
				[Symbol.asyncIterator]() {
					return Promise.resolve(asyncIterator);
				}
			}

			class AsyncIterableFromAlias {
				[Symbol.asyncIterator](): AsyncIteratorResult {
					return Promise.resolve(asyncIterator);
				}
			}
		`),
	],
});

// A second `[Symbol.asyncDispose]` would shadow this one, the later member wins
test({
	valid: [],
	invalid: [
		{
			code: 'class C {\n\tasync [Symbol.asyncDispose]() { await flush(); }\n\tasync [Symbol.dispose]() { await cleanup(); }\n}',
			errors: 1,
		},
		{
			code: 'class C {\n\tstatic async [Symbol.dispose]() { await cleanup(); }\n}',
			output: 'class C {\n\tstatic async [Symbol.asyncDispose]() { await cleanup(); }\n}',
			errors: 1,
		},
		{
			code: 'class C {\n\tasync [Symbol.dispose]() { await cleanup(); }\n}',
			output: 'class C {\n\tasync [Symbol.asyncDispose]() { await cleanup(); }\n}',
			errors: 1,
		},
	],
});

// `Symbol.asyncDispose` and `Symbol['asyncDispose']` are the same key
test({
	valid: [],
	invalid: [
		...[
			'class C {\n\tasync [Symbol.dispose]() {}\n\tasync [Symbol.asyncDispose]() {}\n}',
			'class C {\n\tasync [Symbol.dispose]() {}\n\tasync [Symbol["asyncDispose"]]() {}\n}',
			'class C {\n\tstatic async [Symbol.dispose]() {}\n\tstatic async [Symbol["asyncDispose"]]() {}\n}',
			'class C {\n\tasync [Symbol.dispose]() {}\n\t[Symbol.asyncDispose] = () => {};\n}',
			'class C {\n\tasync [Symbol.dispose]() {}\n\t[Symbol["asyncDispose"]] = () => {};\n}',
			'class C {\n\tstatic async [Symbol.dispose]() {}\n\tstatic [Symbol.asyncDispose] = () => {};\n}',
			'const object = {\n\tasync [Symbol.dispose]() {},\n\t[Symbol.asyncDispose]() {},\n};',
			'const object = {\n\tasync [Symbol.dispose]() {},\n\tasync [Symbol["asyncDispose"]]() {},\n};',
		].map(code => ({code, errors: 1})),
		{
			code: 'class C {\n\tasync [Symbol.dispose]() {}\n}',
			output: 'class C {\n\tasync [Symbol.asyncDispose]() {}\n}',
			errors: 1,
		},
		{
			code: 'const object = {\n\tasync [Symbol.dispose]() {},\n\tasyncDispose() {},\n};',
			output: 'const object = {\n\tasync [Symbol.asyncDispose]() {},\n\tasyncDispose() {},\n};',
			errors: 1,
		},
		// A static and an instance member do not share a key
		{
			code: 'class C {\n\tstatic async [Symbol.dispose]() {}\n\tasync [Symbol.asyncDispose]() {}\n}',
			output: 'class C {\n\tstatic async [Symbol.asyncDispose]() {}\n\tasync [Symbol.asyncDispose]() {}\n}',
			errors: 1,
		},
		// An accessor has the same key
		{
			code: 'class C {\n\tasync [Symbol.dispose]() {}\n\tget [Symbol.asyncDispose]() {}\n}',
			errors: 1,
		},
		// A spread is not a keyed member
		{
			code: 'const object = {\n\t...other,\n\tasync [Symbol.dispose]() {},\n};',
			output: 'const object = {\n\t...other,\n\tasync [Symbol.asyncDispose]() {},\n};',
			errors: 1,
		},
	],
});
