import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			function foo(bar) {
				while (bar.baz) {
					bar = bar.baz;
				}

				return bar;
			}
		`,
		outdent`
			function foo(bar) {
				for (; bar.baz; bar = bar.baz) {}

				return bar;
			}
		`,
		outdent`
			function foo(bar) {
				if (Array.isArray(bar)) {
					return bar.map(baz => foo(baz));
				}

				return bar;
			}
		`,
		outdent`
			function foo(value) {
				return 1 + foo(value);
			}
		`,
		outdent`
			function foo(value) {
				return value ? foo(value.next) : value;
			}
		`,
		outdent`
			function foo(value) {
				function bar() {
					return foo(value);
				}

				return bar();
			}
		`,
		outdent`
			function foo(value) {
				const foo = () => value;
				return foo();
			}
		`,
		outdent`
			function foo(value) {
				return foo?.(value);
			}
		`,
		outdent`
			function foo(value) {
				return object.foo(value);
			}
		`,
		outdent`
			const foo = value => {
				return foo(value);
			};
		`,
		outdent`
			const foo = function (value) {
				return foo(value);
			};
		`,
		outdent`
			function * foo(value) {
				return foo(value);
			}
		`,
		outdent`
			const object = {
				foo(value) {
					return foo(value);
				},
			};
		`,
		outdent`
			class Foo {
				foo(value) {
					return foo(value);
				}
			}
		`,
		outdent`
			const object = {
				get foo() {
					return this.foo;
				},
			};
		`,
		outdent`
			function foo(value) {
				try {
					return foo(value.next);
				} finally {
					cleanup(value);
				}
			}
		`,
	],
	invalid: [
		outdent`
			function foo(bar) {
				if (bar.baz) {
					return foo(bar.baz);
				}

				return bar;
			}
		`,
		outdent`
			const bar = function foo(value) {
				return foo(value.next);
			};
		`,
		outdent`
			function foo(first, second) {
				return foo(first.next, second.next);
			}
		`,
		outdent`
			function foo() {
				return foo();
			}
		`,
		outdent`
			async function foo(value) {
				if (value) {
					return foo(value.next);
				}

				return value;
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
	valid: [],
	invalid: [
		outdent`
			function foo(bar: Bar) {
				return foo(bar.baz as Bar);
			}
		`,
	],
});
