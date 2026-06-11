import {fileURLToPath} from 'node:url';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const fixtureDirectory = fileURLToPath(new URL('fixtures/prefer-dispose/', import.meta.url));

test.snapshot({
	valid: [
		// No `finally`
		outdent`
			const foo = open();
			try {
				use(foo);
			} catch (error) {
				handle(error);
			}
		`,
		// Resource used after the `try`
		outdent`
			const foo = open();
			try {
				use(foo);
			} finally {
				foo.close();
			}
			log(foo);
		`,
		// Resource reassigned after the `try`
		outdent`
			let foo = open();
			try {
				use(foo);
			} finally {
				foo.close();
			}
			foo = undefined;
		`,
		// Resource reassigned inside the `try`
		outdent`
			let foo = open();
			try {
				foo = reopen();
			} finally {
				foo.close();
			}
		`,
		// `var` is function-scoped, converting would change scoping
		outdent`
			var foo = open();
			try {
				use(foo);
			} finally {
				foo.close();
			}
		`,
		// Disposal call has arguments
		outdent`
			const foo = open();
			try {
				use(foo);
			} finally {
				foo.close(true);
			}
		`,
		// Multiple declarators in one declaration
		outdent`
			const foo = open(), bar = 1;
			try {
				use(foo);
			} finally {
				foo.close();
			}
		`,
		// Declaration not immediately before the `try`
		outdent`
			const foo = open();
			doSomethingElse();
			try {
				use(foo);
			} finally {
				foo.close();
			}
		`,
		// Conditional disposal (not a bare disposal statement)
		outdent`
			const foo = open();
			try {
				use(foo);
			} finally {
				if (foo) foo.close();
			}
		`,
		// Extra statement in the `finally`
		outdent`
			const foo = open();
			try {
				use(foo);
			} finally {
				foo.close();
				cleanup();
			}
		`,
		// Computed string key
		outdent`
			const foo = open();
			try {
				use(foo);
			} finally {
				foo['close']();
			}
		`,
		// Duplicate disposal of the same resource
		outdent`
			const foo = open();
			try {
				use(foo);
			} finally {
				foo.close();
				foo.close();
			}
		`,
		// Destructured declaration
		outdent`
			const {foo} = open();
			try {
				use(foo);
			} finally {
				foo.close();
			}
		`,
		// Declaration without an initializer
		outdent`
			let foo;
			foo = open();
			try {
				use(foo);
			} finally {
				foo.close();
			}
		`,
		// Exported declaration
		outdent`
			export const foo = open();
			try {
				use(foo);
			} finally {
				foo.close();
			}
		`,
		// `await using` needed but not in an async context
		outdent`
			function nonAsync() {
				const foo = open();
				try {
					use(foo);
				} finally {
					foo[Symbol.asyncDispose]();
				}
			}
		`,
		// `await using` needed but inside a class static block, where `await` is not allowed
		outdent`
			class Foo {
				static {
					const foo = open();
					try {
						use(foo);
					} finally {
						foo[Symbol.asyncDispose]();
					}
				}
			}
		`,
		// Unknown variable (not declared before the `try`)
		outdent`
			try {
				use(foo);
			} finally {
				foo.close();
			}
		`,
		// Multiple resources disposed in declaration order — `using` would dispose in reverse, changing the order
		outdent`
			const foo = openFoo();
			const bar = openBar();
			try {
				use(foo, bar);
			} finally {
				foo.close();
				bar.destroy();
			}
		`,
	],
	invalid: [
		// Single resource
		outdent`
			const foo = open();
			try {
				use(foo);
			} finally {
				foo.close();
			}
		`,
		// `let` declaration
		outdent`
			let foo = open();
			try {
				use(foo);
			} finally {
				foo.close();
			}
		`,
		// `dispose`
		outdent`
			const foo = open();
			try {
				use(foo);
			} finally {
				foo.dispose();
			}
		`,
		// `destroy`
		outdent`
			const connection = connect();
			try {
				use(connection);
			} finally {
				connection.destroy();
			}
		`,
		// `end`
		outdent`
			const stream = createStream();
			try {
				process(stream);
			} finally {
				stream.end();
			}
		`,
		// `Symbol.dispose`
		outdent`
			const foo = open();
			try {
				use(foo);
			} finally {
				foo[Symbol.dispose]();
			}
		`,
		// Optional chaining
		outdent`
			const foo = open();
			try {
				use(foo);
			} finally {
				foo?.close();
			}
		`,
		// `await` disposal in an async function
		outdent`
			async function main() {
				const foo = open();
				try {
					await use(foo);
				} finally {
					await foo.close();
				}
			}
		`,
		// `Symbol.asyncDispose` in an async function
		outdent`
			async function main() {
				const foo = open();
				try {
					await use(foo);
				} finally {
					await foo[Symbol.asyncDispose]();
				}
			}
		`,
		// `Symbol.asyncDispose` without `await` still becomes `await using`
		outdent`
			async function main() {
				const foo = open();
				try {
					await use(foo);
				} finally {
					foo[Symbol.asyncDispose]();
				}
			}
		`,
		// `await using` at module top-level
		outdent`
			const foo = open();
			try {
				await use(foo);
			} finally {
				await foo.close();
			}
		`,
		// `catch` is preserved
		outdent`
			const foo = open();
			try {
				use(foo);
			} catch (error) {
				handle(error);
			} finally {
				foo.close();
			}
		`,
		// Multiple resources disposed in reverse declaration order, matching `using`'s LIFO disposal
		outdent`
			const foo = openFoo();
			const bar = openBar();
			try {
				use(foo, bar);
			} finally {
				bar.destroy();
				foo.close();
			}
		`,
		// Inside a function
		outdent`
			function run() {
				const foo = open();
				try {
					use(foo);
				} finally {
					foo.close();
				}
			}
		`,
		// Nested `try`/`finally` — both reported
		outdent`
			const outer = open();
			try {
				const inner = open();
				try {
					use(inner);
				} finally {
					inner.close();
				}
			} finally {
				outer.close();
			}
		`,
		// Comments in the `finally` — reported without a suggestion
		outdent`
			const foo = open();
			try {
				use(foo);
			} finally {
				// Clean up.
				foo.close();
			}
		`,
		// Comment between `}` and `finally` — reported without a suggestion, since the fix would drop it
		outdent`
			const foo = open();
			try {
				use(foo);
			} /* keep me */ finally {
				foo.close();
			}
		`,
		// `try` block declares a binding shadowing the resource — reported without a suggestion, since
		// unwrapping the block would collide with the `using` declaration
		outdent`
			const foo = open();
			try {
				const foo = 1;
				use(foo);
			} finally {
				foo.close();
			}
		`,
		// Comment inside the declaration — preserved by the fix, so a suggestion is still offered
		outdent`
			const foo = /* keep me */ open();
			try {
				use(foo);
			} finally {
				foo.close();
			}
		`,
		// Mixed sync and async disposal — produces both `using` and `await using`
		outdent`
			async function main() {
				const foo = openFoo();
				const bar = openBar();
				try {
					use(foo, bar);
				} finally {
					await bar[Symbol.asyncDispose]();
					foo.close();
				}
			}
		`,
	],
});

// TypeScript: type information confirms the resource is disposable. The fixture `tsconfig` enables
// the `ESNext` lib so the global `Disposable`/`AsyncDisposable` types (and `Symbol.dispose`) resolve.
test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: typescriptEslintParser,
			parserOptions: {
				tsconfigRootDir: fixtureDirectory,
				projectService: {
					allowDefaultProject: ['*.ts'],
					defaultProject: 'tsconfig.json',
				},
			},
		},
	},
	valid: [
		// `.close()` on a type that does not implement `Symbol.dispose`
		{
			code: outdent`
				class Connection {
					close() {}
				}
				const foo = new Connection();
				try {
					use(foo);
				} finally {
					foo.close();
				}
			`,
			filename: 'file.ts',
		},
		// Union type where one member is not disposable — `using` could throw, so don't suggest
		{
			code: outdent`
				const foo: Disposable | {close(): void} = open();
				try {
					use(foo);
				} finally {
					foo[Symbol.dispose]();
				}
			`,
			filename: 'file.ts',
		},
	],
	invalid: [
		// Type implements `Disposable`
		{
			code: outdent`
				const foo: Disposable = open();
				try {
					use(foo);
				} finally {
					foo[Symbol.dispose]();
				}
			`,
			filename: 'file.ts',
		},
		// Type implements `AsyncDisposable`
		{
			code: outdent`
				async function main() {
					const foo: AsyncDisposable = open();
					try {
						await use(foo);
					} finally {
						await foo[Symbol.asyncDispose]();
					}
				}
			`,
			filename: 'file.ts',
		},
	],
});

// A plain TypeScript case without type information still uses the method-name heuristic.
test.snapshot({
	valid: [],
	invalid: [
		{
			code: outdent`
				const resource = acquire();
				try {
					use(resource);
				} finally {
					resource.close();
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
	],
});
