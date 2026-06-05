import outdent from 'outdent';
import {getTester} from './utils/test.js';
import parsers from './utils/parsers.js';

const {test} = getTester(import.meta);

// Async IIFE
test.snapshot({
	valid: [
		'a()',
		'a = async () => {}',
		'(async function *() {})()',
		outdent`
			function foo() {
				if (foo) {
					(async () => {})()
				}
			}
		`,
		'await (async () => {})()',
	],
	invalid: [
		'(async () => {})()',
		'(async () => {})?.()',
		'(async function() {})()',
		'(async function() {}())',
		'(async function run() {})()',
		'(async function(c, d) {})(a, b)',
		'if (foo) (async () => {})()',
		outdent`
			{
				(async () => {})();
			}
		`,
		'a = (async () => {})()',
		'!async function() {}()',
		'void async function() {}()',
		'(async () => {})().catch(foo)',
	],
});

// Promise
test.snapshot({
	valid: [
		'foo.then',
		'await foo.then(bar)',
		'await foo.then(bar).catch(bar)',
		'await foo.then?.(bar)',
		'await foo.then(bar)?.catch(bar)',
		'await foo.then(bar)?.catch?.(bar)',
		outdent`
			class Example {
				property = promise.then(bar)
			}
		`,
		outdent`
			const Example = class Example {
				property = promise.then(bar)
			}
		`,
		outdent`
			class Example {
				static {
					promise.then(bar)
				}
			}
		`,
		outdent`
			const Example = class Example {
				static {
					promise.then(bar)
				}
			}
		`,
		{
			code: 'foo.then(bar)',
			filename: 'foo.cjS',
		},
		'z.string().catch("")',
		'z.coerce.string().catch("")',
		'z.coerce.string().optional().catch("")',
		'z.string().optional().catch("")',
		'(z?.string()).catch("fallback")',
		'z.string().catch("a").optional().catch("b")',
		'schema.catch("fallback")',
		'someSchema.catch("fallback")',
		'someSchema.optional().catch("fallback")',
		'someSchema.default("x").catch("fallback")',
		'someSchema.nullable().catch("fallback")',
		'someSchema.nullish().catch("fallback")',
		'someSchema.catch("a").optional().catch("b")',
		outdent`
			const resultOfRun = run().catch(error => {
				console.error(error);
				process.exit(1);
			});
		`,
		'const promise = foo.then(bar)',
		'const promise = foo?.then?.(bar)',
		{
			code: outdent`
				const promise = foo.then(bar) as Promise<void>;
				const promise2 = foo.then(bar)!;
				const promise3 = <Promise<void>>foo.then(bar);
				const promise4 = foo.then(bar) satisfies Promise<void>;
				const promise5 = foo?.then?.(bar) as Promise<void>;
			`,
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'foo.then(bar)',
		'promise = foo.then(bar)',
		'foo.then?.(bar)',
		'foo?.then(bar)',
		'foo.catch(() => process.exit(1))',
		'foo.finally(bar)',
		'foo.then(bar, baz)',
		'foo.then(bar, baz).finally(qux)',
		'(foo.then(bar, baz)).finally(qux)',
		'(async () => {})().catch(() => process.exit(1))',
		'(async function() {}()).finally(() => {})',
		'for (const foo of bar) foo.then(bar)',
		'foo?.then(bar).finally(qux)',
		'foo.then().toString()',
		'!foo.then()',
		'foo.then(bar).then(baz)?.then(qux)',
		'foo.then(bar).then(baz).then?.(qux)',
		'foo.then(bar).catch(bar).finally(bar)',
		'objectWithCatch.catch()',
		'getCatchMethod().catch()',
		'z["string"]().catch("fallback")',
		'z.string().parse(value).catch(handle)',
		'z.string().safeParse(value).catch(handle)',
		'z.string().spa(value).catch(handle)',
		'z.string().parseAsync(value).catch(handle)',
		'z.string().optional.catch(handle)',
		'z.string().array.catch(handle)',
		'z.string().catch.catch(handle)',
		'z.string.optional().catch(handle)',
		'z.coerce.string.optional().catch(handle)',
		'z.string.array().catch(handle)',
		'z.coerce().string().catch(handle)',
		'z.string().coerce().catch(handle)',
		'schema.fetch().catch(handle)',
		'userSchema.validate().catch(handle)',
		'someSchema.optional.catch(handle)',
		'someSchema.parseAsync(value).catch(handle)',
		'someSchema.then(foo).catch(bar)',
	],
});

// Identifier
test.snapshot({
	valid: [
		'foo()',
		'foo.bar()',
		outdent`
			function foo() {
				return async () => {};
			}
			foo()();
		`,
		outdent`
			const [foo] = [async () => {}];
			foo();
		`,
		outdent`
			function foo() {}
			foo();
		`,
		outdent`
			async function * foo() {}
			foo();
		`,
		outdent`
			var foo = async () => {};
			foo();
		`,
		outdent`
			let foo = async () => {};
			foo();
		`,
		outdent`
			const foo = 1, bar = async () => {};
			foo();
		`,
		outdent`
			async function foo() {}
			const bar = foo;
			bar();
		`,
		{
			code: outdent`
				async function foo() {}
				async function foo() {}
				foo();
			`,
			languageOptions: {parserOptions: {sourceType: 'script'}},
		},
		{
			code: outdent`
				foo();
				async function foo() {}
				async function foo() {}
			`,
			languageOptions: {parserOptions: {sourceType: 'script'}},
		},
		outdent`
			const program = {async run () {}};
			program.run()
		`,
		outdent`
			const program = {async run () {}};
			const {run} = program;
			run()
		`,
		outdent`
			const foo = async () => {};
			await foo();
		`,
		outdent`
			async function run() {}
			const resultOfRun = run();
		`,
		'for (const statement of statements) { statement() };',
		// #2946: lock in that `let`/`var` (and by extension `using`/`await using`)
		// still fall through under `@typescript-eslint/parser`, preserving the
		// rule's intentional const-only behavior alongside the kind fallback.
		{
			code: outdent`
				let foo = async () => {};
				foo();
			`,
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		outdent`
			const foo = async () => {};
			foo();
		`,
		outdent`
			const foo = async () => {};
			foo?.();
		`,
		outdent`
			const foo = async () => {};
			foo().then(foo);
		`,
		outdent`
			const foo = async function () {}, bar = 1;
			foo(bar);
		`,
		outdent`
			foo();
			async function foo() {}
		`,
		outdent`
			const foo = async () => {};
			if (true) {
				alert();
			} else {
				foo();
			}
		`,
		// #2946: the TypeScript parser does not populate `definition.kind`, so
		// falling back to the parent `VariableDeclaration.kind` is required to
		// still flag top-level async-function calls under `@typescript-eslint/parser`.
		{
			code: outdent`
				const foo = async () => {};
				foo();
			`,
			languageOptions: {parser: parsers.typescript},
		},
	],
});

// In `Promise` methods
test.snapshot({
	valid: [
		outdent`
			const foo = async () => {};
			await Promise.all([
				(async () => {})(),
				/* hole */,
				foo(),
				foo?.(),
				foo.then(bar),
				foo.catch(bar),
			]);
			await Promise.allSettled([foo()]);
			await Promise?.any([foo()]);
			await Promise.race?.([foo()]);
		`,
		outdent`
			async function getStat() {}
			const [core, pure, bundle] = await Promise.all([
				getStat('core-js'),
				ALL && getStat('core-js-pure'),
				ALL && getStat('core-js-bundle'),
			]);
		`,
		outdent`
			async function getStat() {}
			const [core] = await Promise.all([
				ALL ? getStat('core-js') : getStat('core-js-pure'),
			]);
		`,
		outdent`
			const foo = async () => {};
			const promise = Promise.all([
				(async () => {})(),
				foo(),
				foo.then(bar),
				foo.catch(bar),
			]);
			await promise;
		`,
		'const promise = (async () => {})()',
		{
			code: 'const promise = (async () => {})() as Promise<void>',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		outdent`
			const runAsync = async () => {};
			const value = true;
			await Promise.all([runAsync() && value]);
		`,
	],
});

test({
	valid: [
		'await foo',
		'await foo()',
		outdent`
			try {
				await run()
			} catch {
				process.exit(1)
			}
		`,
	],
	invalid: [],
});
