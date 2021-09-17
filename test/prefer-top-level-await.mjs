import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

// Async IIFE
test.snapshot({
	valid: [
		'a()',
		'a = async () => {}',
		'(async function *() {})()',
		'(async () => {})?.()',
		outdent`
			function foo() {
				if (foo) {
					(async () => {})()
				}
			}
		`,
	],
	invalid: [
		'(async () => {})()',
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
	],
});

// Promise
test.snapshot({
	valid: [
		'foo.then',
		'foo.then?.(bar)',
		'foo?.then(bar)',
	],
	invalid: [
		'foo.then(bar)',
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
			parserOptions: {sourceType: 'script'},
		},
		{
			code: outdent`
				foo();
				async function foo() {}
				async function foo() {}
			`,
			parserOptions: {sourceType: 'script'},
		},
		outdent`
			const foo = async () => {};
			foo?.();
		`,
		outdent`
			const program = {async run () {}};
			program.run()
		`,
		outdent`
			const program = {async run () {}};
			const {run} = program;
			run()
		`,
	],
	invalid: [
		outdent`
			const foo = async () => {};
			foo();
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
	],
});

test.babel({
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

