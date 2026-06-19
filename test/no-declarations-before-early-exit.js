import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);
const typescriptLanguageOptions = {
	parser: parsers.typescript.implementation,
	parserOptions: parsers.typescript.mergeParserOptions(),
};

test.snapshot({
	valid: [
		outdent`
			function foo(bar) {
				const result = 1;
				console.log(result);
				if (!bar) {
					return;
				}
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					return;
				}
			}
		`,
		outdent`
			function foo(bar) {
				const result = getResult();
				doSomething();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				var result = 1;
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const {result} = getResult();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			export const result = 1;
			if (!bar) {
				throw new Error();
			}
			console.log(result);
		`,
		outdent`
			function foo(items) {
				for (const item of items) {
					const result = 1;
					if (!item) {
						continue;
					} else {
						break;
					}
					console.log(result);
				}
			}
		`,
		outdent`
			function foo(value) {
				switch (value) {
					case 1:
						const result = 1;
						if (!bar) {
							break;
						}
						console.log(result);
				}
			}
		`,
		outdent`
			function foo(bar) {
				using result = getResult();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			async function foo(bar) {
				await using result = getResult();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo() {
				const result = getResult();
				if (!result) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				let result;
				result = getResult();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = getResult();
				if (!bar) {
					return result;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = getResult();
				if (!bar) {
					return;
				} else {
					console.log(result);
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					return;
				} else {
					throw new Error();
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					return;
				} else {
					cleanup();
					throw new Error();
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar, baz) {
				const result = 1;
				if (!bar) {
					return;
				} else if (baz) {
					throw new Error();
				} else {
					return;
				}
				console.log(result);
			}
		`,
		{
			code: outdent`
				function foo(bar: boolean) {
					const result = getResult();
					if (!bar) {
						return;
					}
					let value: typeof result;
				}
			`,
			languageOptions: typescriptLanguageOptions,
		},
		{
			code: outdent`
				declare const result: string;
				if (!bar) {
					throw new Error();
				}
				console.log(result);
			`,
			languageOptions: typescriptLanguageOptions,
		},
		// Initializer mutates a variable the guard's condition reads.
		outdent`
			function foo(parts) {
				const last = parts.pop();
				if (parts.length > 0) {
					throw new Error();
				}
				console.log(last);
			}
		`,
		outdent`
			function foo(parts) {
				const first = parts.shift();
				if (parts.length === 0) {
					return;
				}
				console.log(first);
			}
		`,
		// The guard's condition mutates a variable the initializer reads.
		outdent`
			function foo(array) {
				const first = array[0];
				if (array.shift()) {
					return;
				}
				console.log(first);
			}
		`,
		// The guard's body observes the initializer's side effect.
		outdent`
			function foo(array, bar) {
				const last = array.pop();
				if (bar) {
					throw new Error(array.length);
				}
				console.log(last);
			}
		`,
		// Initializer assigns a variable the guard reads.
		outdent`
			function foo() {
				let count = 0;
				const result = (count = getCount());
				if (count > 0) {
					return;
				}
				console.log(result);
			}
		`,
		// Initializer increments an index the guard reads.
		outdent`
			function foo(items) {
				let index = 0;
				const current = items[index++];
				if (index < items.length) {
					return;
				}
				console.log(current);
			}
		`,
		// Both sides are method calls on the same object, which are treated as side effects.
		outdent`
			function foo(queue) {
				const next = queue.dequeue();
				if (queue.isEmpty()) {
					return;
				}
				console.log(next);
			}
		`,
		// Optional-chaining call in the initializer mutates a variable the guard reads.
		outdent`
			function foo(array) {
				const last = array?.pop();
				if (array.length > 0) {
					return;
				}
				console.log(last);
			}
		`,
		// The side effect is nested inside a logical expression in the guard's condition.
		outdent`
			function foo(array) {
				const first = array[0];
				if (array.shift() && array.length > 0) {
					return;
				}
				console.log(first);
			}
		`,
		// Inside a loop, the initializer mutates a variable the `break` guard reads.
		outdent`
			function foo(queue) {
				for (let index = 0; index < 10; index++) {
					const item = queue.dequeue();
					if (queue.isEmpty()) {
						break;
					}
					process(item);
				}
			}
		`,
		{
			code: outdent`
				function foo(parts: string[]) {
					const name = parts.pop() ?? 'default';
					if (parts.length > 0) {
						throw new Error();
					}
					return name;
				}
			`,
			languageOptions: typescriptLanguageOptions,
		},
		// React hook calls must run unconditionally, so they cannot be moved below an early exit.
		outdent`
			function Component(bar) {
				const value = useMemo(() => compute(), []);
				if (!bar) {
					return null;
				}
				return value;
			}
		`,
		outdent`
			function Component(bar) {
				const reference = useRef(null);
				if (!bar) {
					return null;
				}
				return reference;
			}
		`,
		outdent`
			function Component(bar) {
				const value = React.useMemo(() => compute(), []);
				if (!bar) {
					return null;
				}
				return value;
			}
		`,
		outdent`
			function Component(bar) {
				const data = useData();
				if (!bar) {
					return null;
				}
				return data;
			}
		`,
		outdent`
			function Component(bar) {
				const value = use(promise);
				if (!bar) {
					return null;
				}
				return value;
			}
		`,
		{
			code: outdent`
				function Component(bar: boolean) {
					const value = useMemo<number>(() => compute(), []);
					if (!bar) {
						return null;
					}
					return value;
				}
			`,
			languageOptions: typescriptLanguageOptions,
		},
		// A `switch` with a `break` does not always exit, so the `if` is not a guard.
		outdent`
			function foo(bar, type) {
				const result = 1;
				if (!bar) {
					switch (type) {
						case 'a':
							doSomething();
							break;
						default:
							return;
					}
				}
				console.log(result);
			}
		`,
		// A non-exhaustive `switch` (no `default`) can fall through, so the `if` is not a guard.
		outdent`
			function foo(bar, type) {
				const result = 1;
				if (!bar) {
					switch (type) {
						case 'a':
							return;
					}
				}
				console.log(result);
			}
		`,
		// The `catch` can fall through, so the `if` is not a guard.
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					try {
						return getValue();
					} catch {}
				}
				console.log(result);
			}
		`,
		// Neither branch alone always exits, so the `if` is not a guard.
		outdent`
			function foo(bar) {
				const result = 1;
				if (bar) {
					doSomething();
				} else {
					doSomethingElse();
				}
				console.log(result);
			}
		`,
		// A `try/catch` where the `catch` falls through is not a guard.
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					try {
						throw new Error();
					} catch (error) {
						console.error(error);
					}
				}
				console.log(result);
			}
		`,
		// A `while` with a `break` can fall through, so the `if` is not a guard.
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					while (condition) {
						break;
					}
				}
				console.log(result);
			}
		`,
		// A `return` inside a nested function does not make the `if` a guard.
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					const inner = () => {
						return;
					};
				}
				console.log(result);
			}
		`,
		// Everything after the `return` is unreachable, so the `if` is dead code and not a guard.
		outdent`
			function foo(bar) {
				return;
				const result = 1;
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		// The initializer suspends with `await`, so the guard must not be reordered before it.
		outdent`
			async function foo(bar) {
				const result = await getResult();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		// Same for `await` nested inside the initializer expression.
		outdent`
			async function foo(bar) {
				const result = wrap(await getResult());
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		// The initializer suspends with `await`, so the guard checking `signal.aborted` must not be reordered before it.
		{
			code: outdent`
				async function run(signal: AbortSignal) {
					const result = await doSomethingAsynchronous();
					if (signal.aborted) {
						return;
					}
					await doSomethingElse(result);
				}
			`,
			languageOptions: typescriptLanguageOptions,
		},
		outdent`
			async function foo(bar) {
				const result = bar ? await a() : b();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		// The initializer suspends with `yield`, so the guard must not be reordered before it.
		outdent`
			function * foo(bar) {
				const result = yield getResult();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function * foo(bar) {
				const result = yield* getResults();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		// The `await` is hidden inside a TypeScript type assertion, but still suspends `foo`.
		{
			code: outdent`
				async function foo(bar) {
					const result = await getResult() as Result;
					if (!bar) {
						return;
					}
					console.log(result);
				}
			`,
			languageOptions: typescriptLanguageOptions,
		},
		// Top-level `await` suspends module evaluation, so the guard must not be reordered before it.
		{
			code: outdent`
				const result = await getResult();
				if (!bar) {
					throw new Error();
				}
				console.log(result);
			`,
			languageOptions: {sourceType: 'module'},
		},
	],
	invalid: [
		outdent`
			function foo(bar) {
				const result = getResult();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = \`result\`;
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				console.log(bar);
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			const result = 1;
			if (!bar) {
				throw new Error();
			}
			console.log(result);
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) return;
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					throw new Error();
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				let result;
				if (!bar) {
					return;
				}
				result = getResult();
				console.log(result);
			}
		`,
		outdent`
			function foo(items) {
				for (const item of items) {
					const result = 1;
					if (!item) {
						break;
					}
					console.log(result);
				}
			}
		`,
		outdent`
			function foo(items) {
				for (const item of items) {
					const result = 1;
					if (!item) {
						continue;
					}
					console.log(result);
				}
			}
		`,
		outdent`
			function foo(value) {
				switch (value) {
					case 1: {
						const result = 1;
						if (!bar) {
							break;
						}
						console.log(result);
					}
				}
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					cleanup();
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (bar) {
					console.log(bar);
				} else {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1, other = 2;
				if (!bar) {
					return;
				}
				console.log(result, other);
			}
		`,
		outdent`
			function foo(bar) {
				const result = object.result;
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = new Result();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar, items) {
				const result = [...items];
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar, object) {
				const result = {...object};
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				let source;
				const result = source = 1;
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				let index = 0;
				const result = index++;
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				// Keep this comment.
				const result = 1;
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1; // Keep this comment.
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) return; // Keep this comment.
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				// Keep this comment.
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					return;
				} else {
					console.log(bar);
				}
				console.log(result);
			}
		`,
		// Initializer has a side effect, but on a variable the guard does not touch.
		outdent`
			function foo(bar, parts) {
				const last = parts.pop();
				if (!bar) {
					return;
				}
				console.log(last);
			}
		`,
		// Initializer and guard share a variable, but neither side has a side effect.
		outdent`
			function foo(config) {
				const name = config.name;
				if (config.enabled) {
					return;
				}
				console.log(name);
			}
		`,
		// The guard's condition has a side effect, but on a variable the initializer does not read.
		outdent`
			function foo(items) {
				const result = 1;
				if (items.pop()) {
					return;
				}
				console.log(result);
			}
		`,
		// Only the conflicting declarator is skipped; the independent one is still reported.
		outdent`
			function foo(array) {
				const a = array.pop(), b = 1;
				if (array.length > 0) {
					return;
				}
				console.log(a, b);
			}
		`,
		// Creating a closure is not a side effect, so the declaration can be moved even though the closure captures a variable the guard reads.
		outdent`
			function foo(array) {
				const pop = () => array.pop();
				if (array.length > 0) {
					return;
				}
				pop();
			}
		`,
		// `useless` is not a hook name (`use` is not followed by an uppercase letter), so it is still reported.
		outdent`
			function foo(bar) {
				const value = useless();
				if (!bar) {
					return;
				}
				console.log(value);
			}
		`,
		// A PascalCase-namespaced call is only a hook when the property is a hook name, so `React.compute()` is still reported.
		outdent`
			function foo(bar) {
				const value = React.compute();
				if (!bar) {
					return;
				}
				console.log(value);
			}
		`,
		// The guard's exiting branch ends in an exhaustive `switch`, detected via code path analysis.
		outdent`
			function foo(bar, type) {
				const result = 1;
				if (!bar) {
					switch (type) {
						case 'a':
							throw new Error('a');
						default:
							throw new Error('unknown');
					}
				}
				console.log(result);
			}
		`,
		// The guard's exiting branch ends in a `try`/`finally` that always returns.
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					try {
						return getValue();
					} finally {
						cleanup();
					}
				}
				console.log(result);
			}
		`,
		// The guard's exiting branch ends in an infinite loop.
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					while (true) {
						poll();
					}
				}
				console.log(result);
			}
		`,
		// `else if` guard whose every branch ends in an exhaustive `switch`.
		outdent`
			function foo(bar, type) {
				const result = 1;
				if (bar) {
					doSomething();
				} else {
					switch (type) {
						case 'a':
							return;
						default:
							throw new Error();
					}
				}
				console.log(result);
			}
		`,
		// A nested `if/else` where all branches always exit makes the `if` a guard.
		outdent`
			function foo(bar, baz) {
				const result = 1;
				if (!bar) {
					if (baz) {
						return;
					} else {
						throw new Error();
					}
				}
				console.log(result);
			}
		`,
		// A `try/catch` where both `try` and `catch` always throw makes the `if` a guard.
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					try {
						throw new Error('try');
					} catch {
						throw new Error('catch');
					}
				}
				console.log(result);
			}
		`,
		// A `do/while(true)` infinite loop never falls through, so the `if` is a guard.
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					do {
						poll();
					} while (true);
				}
				console.log(result);
			}
		`,
		// The `await` is inside a nested function, so it is not a suspension point of `foo`. The declaration is still reported.
		outdent`
			async function foo(bar) {
				const result = async () => await getResult();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		// The `yield` is inside a nested generator, so it is not a suspension point of `foo`. The declaration is still reported.
		outdent`
			function * foo(bar) {
				const result = function * () { yield getResult(); };
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		// The `yield*` is inside a nested generator, so it is not a suspension point of `foo`. The declaration is still reported.
		outdent`
			function * foo(bar) {
				const result = function * () { yield * getResults(); };
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		// Only `b` is reported. Its sibling `a` suspends with `await`, so the suspension check skips `a` individually.
		outdent`
			async function foo(bar) {
				const a = await getResult(), b = 1;
				if (!bar) {
					return;
				}
				console.log(a, b);
			}
		`,
	],
});
