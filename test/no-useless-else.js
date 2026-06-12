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
		outdent`
			for (const foo of bar)
				if (foo) {
					continue;
				} else {
					baz();
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
	],
});
