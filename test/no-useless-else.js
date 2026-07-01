import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			function qux() {
				if (foo) {
					return;
				}
			}
		`,
		outdent`
			if (foo) {
				bar();
			} else {
				baz();
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					if (bar) {
						return;
					}
				} else {
					baz();
				}
			}
		`,
		outdent`
			const value = foo
				? bar()
				: baz();
		`,
		// The `catch` can fall through (`bar()` may throw), so the `else` is not useless.
		outdent`
			function qux() {
				if (foo) {
					try {
						return bar();
					} catch {}
				} else {
					baz();
				}
			}
		`,
		outdent`
			if (foo) {
				while (bar) {
					break;
				}
			} else {
				baz();
			}
		`,
		outdent`
			if (foo) {
				switch (bar) {
					case baz:
						break;
				}
			} else {
				qux();
			}
		`,
		// Non-exhaustive `switch` (no `default`) can fall through.
		outdent`
			function qux() {
				if (foo) {
					switch (bar) {
						case 1:
							return;
					}
				} else {
					baz();
				}
			}
		`,
		// Exhaustive `switch`, but a `case` uses `break`, so it falls through.
		outdent`
			function qux() {
				if (foo) {
					switch (bar) {
						case 1:
							qux();
							break;
						default:
							return;
					}
				} else {
					baz();
				}
			}
		`,
		outdent`
			for (const foo of bar)
				if (foo) {
					continue;
				} else {
					baz();
				}
		`,
		// A labeled `break` that targets an inner loop does not exit the consequent.
		outdent`
			function qux() {
				if (foo) {
					outer: for (const a of b) {
						for (const c of d) {
							break outer;
						}
					}
				} else {
					baz();
				}
			}
		`,
		// `switch` with a `default` but a reachable `break`, so it falls through.
		outdent`
			function qux() {
				if (foo) {
					switch (bar) {
						case 1:
							return;
						default:
							break;
					}
				} else {
					baz();
				}
			}
		`,
		// `try` whose `catch` falls through.
		outdent`
			function qux() {
				if (foo) {
					try {
						doSomething();
					} catch {
						handle();
					}
				} else {
					baz();
				}
			}
		`,
		// Conditional `return` inside the consequent (only one path exits).
		outdent`
			function qux() {
				if (foo) {
					if (inner) {
						return;
					}
				} else {
					baz();
				}
			}
		`,
		// `do...while(true)` with a `break` — the loop can exit normally, so the else is needed.
		outdent`
			function qux() {
				if (foo) {
					do {
						if (bar) {
							break;
						}
					} while (true);
				} else {
					baz();
				}
			}
		`,
		// `for...of` with a `return` — the return only happens per iteration; the loop itself can end normally.
		outdent`
			function qux() {
				if (foo) {
					for (const x of xs) {
						return x;
					}
				} else {
					baz();
				}
			}
		`,
		// `try/catch/finally` where the `try` returns but the `catch` falls through — the else is needed because the catch path survives.
		outdent`
			function qux() {
				if (foo) {
					try {
						return doSomething();
					} catch {
						handle();
					} finally {
						cleanup();
					}
				} else {
					baz();
				}
			}
		`,
		// A `return` inside a nested function does not exit the consequent.
		outdent`
			function qux() {
				if (foo) {
					const inner = () => {
						return 1;
					};
				} else {
					baz();
				}
			}
		`,
		// A `return` inside a nested function declaration does not exit the consequent.
		outdent`
			function qux() {
				if (foo) {
					function inner() {
						return 1;
					}
				} else {
					baz();
				}
			}
		`,
		// The `if` is unreachable (dead code after `return`), so it is not analyzed even though the consequent exits.
		outdent`
			function qux() {
				return;
				if (foo) {
					return;
				} else {
					baz();
				}
			}
		`,
		outdent`
			function qux() {
				return;
				if (foo) {
					process.exit();
				} else {
					baz();
				}
			}
		`,
		outdent`
			function qux(process) {
				if (foo) {
					process.exit();
				} else {
					baz();
				}
			}
		`,
		outdent`
			import process from 'node:process';

			if (foo) {
				process.exit();
			} else {
				baz();
			}
		`,
		outdent`
			if (foo) {
				process.exitCode = 1;
			} else {
				baz();
			}
		`,
		outdent`
			if (foo) {
				process?.exit();
			} else {
				baz();
			}
		`,
		outdent`
			if (foo) {
				process.exit?.();
			} else {
				baz();
			}
		`,
		outdent`
			if (foo) {
				process['exit']();
			} else {
				baz();
			}
		`,
		outdent`
			if (foo) {
				lib.process.exit();
			} else {
				baz();
			}
		`,
		outdent`
			if (foo) {
				new process.exit();
			} else {
				baz();
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					try {
						process.exit();
					} finally {
						cleanup();
					}
				} else {
					baz();
				}
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					if (bar) {
						process.exit();
					}
				} else {
					baz();
				}
			}
		`,
	],
	invalid: [
		outdent`
			function qux() {
				if (foo) {
					return;
				} else {
					bar();
				}
			}
		`,
		// `try` always returns (`finally` only runs cleanup), so the `else` is useless.
		outdent`
			function qux() {
				if (foo) {
					try {
						return bar();
					} finally {
						cleanup();
					}
				} else {
					baz();
				}
			}
		`,
		// Exhaustive `switch` where every clause exits.
		outdent`
			function qux() {
				if (foo) {
					switch (bar) {
						case 1:
							return;
						default:
							throw new Error();
					}
				} else {
					baz();
				}
			}
		`,
		// Infinite loop never falls through.
		outdent`
			function qux() {
				if (foo) {
					while (true) {
						doSomething();
					}
				} else {
					baz();
				}
			}
		`,
		// `for (;;)` infinite loop never falls through.
		outdent`
			function qux() {
				if (foo) {
					for (;;) {
						doSomething();
					}
				} else {
					baz();
				}
			}
		`,
		// `do...while(true)` with no `break` — infinite loop never falls through, so the else is useless.
		outdent`
			function qux() {
				if (foo) {
					do {
						doSomething();
					} while (true);
				} else {
					baz();
				}
			}
		`,
		// `switch` with fall-through where the empty case falls into a returning case.
		outdent`
			function qux() {
				if (foo) {
					switch (bar) {
						case 1:
						case 2:
							return;
						default:
							throw new Error();
					}
				} else {
					baz();
				}
			}
		`,
		// `try`/`catch` where both the `try` and `catch` always exit.
		outdent`
			function qux() {
				if (foo) {
					try {
						return doSomething();
					} catch {
						throw new Error();
					}
				} else {
					baz();
				}
			}
		`,
		// Nested `if`/`else if`/`else` chain where every branch exits.
		outdent`
			function qux() {
				if (foo) {
					if (a) {
						return;
					} else if (b) {
						throw new Error();
					} else {
						return;
					}
				} else {
					baz();
				}
			}
		`,
		// A labeled `continue` that targets the enclosing loop always exits the consequent.
		outdent`
			function qux() {
				outer: for (const a of b) {
					if (foo) {
						continue outer;
					} else {
						baz();
					}
				}
			}
		`,
		// A `finally` that always returns means the `try` always exits, even though the `try` body falls through.
		outdent`
			function qux() {
				if (foo) {
					try {
						doSomething();
					} finally {
						return cleanup();
					}
				} else {
					baz();
				}
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					return;
				} else { bar(); }
			}
		`,
		outdent`
			if (foo) {
				throw new Error();
			} else {
				bar();
			}
		`,
		outdent`
			while (foo) {
				if (bar) {
					break;
				} else {
					baz();
				}
			}
		`,
		outdent`
			while (foo) {
				if (bar) {
					continue;
				} else {
					baz();
				}
			}
		`,
		outdent`
			switch (foo) {
				case bar:
					if (baz) {
						break;
					} else {
						qux();
					}
			}
		`,
		outdent`
			class Foo {
				static {
					if (foo) {
						throw new Error();
					} else {
						bar();
					}
				}
			}
		`,
		outdent`
			function qux() {
				if (foo)
					return;
				else
					bar();
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					return;
				} else if (bar) {
					baz();
				}
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					if (bar) {
						return;
					} else {
						throw new Error();
					}
				} else {
					baz();
				}
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					return;
				} else {
					// Keep this comment.
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					return;
				} else {
					/*
					Keep this comment.
					*/
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					return;
				} else {
					bar(\`foo\`);
				}
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					return;
				} else {
					bar(\`
				left
			\`);
				}
			}
		`,
		outdent.string(String.raw`
			function qux() {
				if (foo) {
					return;
				} else {
					bar('foo\
			bar');
				}
			}
		`),
		// A template literal inside a JSX expression container is still multiline-unsafe (not JSXText).
		{
			code: outdent`
				function qux() {
					if (foo) {
						return;
					} else {
						return (
							<div>{\`
								multiline
								template
							\`}</div>
						);
					}
				}
			`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		{
			code: outdent`
				function qux() {
					if (foo) {
						return;
					} else {
						return <pre>
							line
						</pre>;
					}
				}
			`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		// A multiline string attribute is reindent-unsafe, so the fix is not offered.
		{
			code: outdent`
				function qux() {
					if (foo) {
						return;
					} else {
						<Widget title="first
							second" />;
					}
				}
			`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		// Multiline JSX is reindent-safe, so the fix is offered.
		{
			code: outdent`
				function qux() {
					if (foo) {
						return;
					} else {
						render(<div>
							text
						</div>);
					}
				}
			`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		{
			code: outdent`
				function init() {
					if (tagName) {
						addTagToFooter(tagName);
						return;
					} else {
						void addReleaseBanner(
							<>
								No <ExplanationLink>stable version tags</ExplanationLink> for this PR.
							</>,
							signal,
						);
					}
				}
			`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		// A reindent-unsafe multiline token (here a template literal) blocks the fix even when multiline JSX is also present.
		{
			code: outdent`
				function qux() {
					if (foo) {
						return;
					} else {
						render(<div>
							text
						</div>, css\`
							color: red;
						\`);
					}
				}
			`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		outdent`
			function qux() {
				if (foo) {
					return;
				} else {
					const bar = 1;
					baz(bar);
				}
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					return;
				} else {
					let bar = 1;
					baz(bar);
				}
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					return;
				} else {
					class Bar {}
					baz(Bar);
				}
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					return;
				} else {
					function bar() {}
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					return;
				} else /* comment */ {
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					return;
				} /* comment */ else {
					bar();
				}
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					return;
				} else {
					bar();
				} // trailing
				baz();
			}
		`,
		{
			code: outdent`
				function qux(foo) {
					if (foo) {
						return;
					} else function bar() {}
				}
			`,
			languageOptions: {
				ecmaVersion: 5,
				sourceType: 'script',
			},
		},
		outdent`
			function qux() {
				if (foo) {
					return;
				} else {
					bar()
				} baz()
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					return;
				} else {
					bar = function() {}
				}
				(baz)();
			}
		`,
		{
			code: outdent`
				function qux() {
					if (foo) {
						return;
					} else {
						<Foo>
							text
						</Foo>
					}
					<Bar />
				}
			`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		outdent`
			function qux() {
				if (foo)
					return
				else
					[bar].forEach(baz)
			}
		`,
		{
			code: outdent`
				function qux() {
					if (foo) {
						return;
					} else {
						type Bar = string;
						baz();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function qux() {
					if (foo) {
						return;
					} else {
						interface Bar {}
						baz();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function qux() {
					if (foo) {
						return;
					} else {
						enum Bar {}
						baz();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function qux() {
					if (foo) {
						return;
					} else {
						namespace Bar {}
						baz();
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			function qux() {
				if (foo) {
					process.exit();
				} else {
					baz();
				}
			}
		`,
		outdent`
			function qux() {
				if (foo)
					process.exit(1);
				else
					baz();
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					setup();
					process.exit(1);
				} else {
					baz();
				}
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					{
						process.exit();
					}
				} else {
					baz();
				}
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					process.exit(1);
				} else if (bar) {
					baz();
				}
			}
		`,
		outdent`
			function qux() {
				if (foo) {
					if (bar) {
						return;
					} else {
						process.exit(1);
					}
				} else {
					baz();
				}
			}
		`,
	],
});
