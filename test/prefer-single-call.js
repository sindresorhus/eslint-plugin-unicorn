import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

// `Array#push()`
test.snapshot({
	valid: [
		// Known non-array receiver (type information)
		{
			code: 'function f(foo: {push(value: number): void}) { foo.push(1); foo.push(2); }',
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			foo.forEach(fn);
			foo.forEach(fn);
		`,
		'foo.push(1);',
		outdent`
			foo.push(1);
			foo.unshift(2);
		`,
		outdent`
			foo.push(1);; // <- there is a "EmptyStatement" between
			foo.push(2);
		`,
		// Not same array
		outdent`
			foo.push(1);
			bar.push(2);
		`,
		// `.push` selector
		'foo.push(1);push(2)',
		'push(1);foo.push(2)',
		'new foo.push(1);foo.push(2)',
		'foo.push(1);new foo.push(2)',
		'foo[push](1);foo.push(2)',
		'foo.push(1);foo[push](2)',
		'foo.push(foo.push(1));',
		// Not `ExpressionStatement`
		outdent`
			const length = foo.push(1);
			foo.push(2);
		`,
		outdent`
			foo.push(1);
			const length = foo.push(2);
		`,
		// Not considered same array
		outdent`
			foo().push(1);
			foo().push(2);
		`,
		outdent`
			foo().bar.push(1);
			foo().bar.push(2);
		`,
		// Ignored
		outdent`
			const stream = new Readable();
			stream.push('one string');
			stream.push('another string');
		`,
		outdent`
			class FooReadable extends Readable {
				pushAndEnd(chunk) {
					this.push(chunk);
					this.push(null);
				}
			}
		`,
		outdent`
			class Foo {
				pushAndEnd(chunk) {
					this.stream.push(chunk);
					this.stream.push(null);
				}
			}
		`,
		outdent`
			process.stdin.push(chunk);
			process.stdin.push(null);
		`,
		outdent`
			process.stdout.push(chunk);
			process.stdout.push(null);
		`,
		outdent`
			process.stderr.push(chunk);
			process.stderr.push(null);
		`,
		{
			code: outdent`
				foo.push(1);
				foo.push(2);
				foo.bar.push(1);
				foo.bar.push(2);
			`,
			options: [
				{
					ignore: ['foo.push', 'foo.bar.push'],
				},
			],
		},
		'for (const _ of []) foo.push(bar);',
		outdent`
			function bar() {}
			foo.push(bindEvents);
		`,
		outdent`
			foo.push?.(1);
			foo.push?.(2);
		`,
		// Does not allow optional call
		outdent`
			foo.push(1);
			foo.push?.(2);
		`,
		outdent`
			foo.push?.(1);
			foo.push(2);
		`,
		// A `new Foo()` receiver other than `new Array()` is a known non-array
		'const foo = new Foo(); foo.push(1); foo.push(2);',
	],
	invalid: [
		outdent`
			foo.push(1);
			foo.push(2);
		`,
		outdent`
			(foo.push)(1);
			(foo.push)(2);
		`,
		outdent`
			foo.bar.push(1);
			foo.bar.push(2);
		`,
		outdent`
			foo.push(1);
			(foo).push(2);
		`,
		outdent`
			foo.push();
			foo.push();
		`,
		outdent`
			foo.push(1);
			foo.push();
		`,
		outdent`
			foo.push();
			foo.push(2);
		`,
		outdent`
			foo.push(1, 2);
			foo.push((3), (4));
		`,
		outdent`
			foo.push(1, 2,);
			foo.push(3, 4);
		`,
		outdent`
			foo.push(1, 2);
			foo.push(3, 4,);
		`,
		outdent`
			foo.push(1, 2,);
			foo.push(3, 4,);
		`,
		outdent`
			foo.push(1, 2, ...a,);
			foo.push(...b,);
		`,
		outdent`
			foo.push(bar());
			foo.push(1);
		`,
		// `arguments` in second push has side effect
		outdent`
			foo.push(1);
			foo.push(bar());
		`,
		// Multiple
		outdent`
			foo.push(1,);
			foo.push(2,);
			foo.push(3,);
		`,
		// Should be able to find the previous expression
		outdent`
			if (a) {
				foo.push(1);
				foo.push(2);
			}
		`,
		outdent`
			switch (a) {
				default:
					foo.push(1);
					foo.push(2);
			}
		`,
		outdent`
			function a() {
				foo.push(1);
				foo.push(2);
			}
		`,
		// ASI
		outdent`
			foo.push(1)
			foo.push(2)
			;[foo].forEach(bar)
		`,
		// Still same array
		outdent`
			foo.bar.push(1);
			(foo)['bar'].push(2);
		`,
		// Ignored
		outdent`
			foo.push(1);
			foo.push(2);
			stream.push(1);
			stream.push(2);
		`,
		{
			code: outdent`
				foo.bar.push(1);
				foo.bar.push(2);
				foo.push(1);
				foo.push(2);
				bar.foo.push(1);
				bar.foo.push(2);
			`,
			options: [
				{
					ignore: ['foo', 'foo.bar'],
				},
			],
		},
		outdent`
			foo.push(1);
			foo?.push(2);
		`,
		outdent`
			foo?.push(1);
			foo.push(2);
		`,
		outdent`
			foo?.push(1);
			foo?.push(2);
		`,
		outdent`
			foo?.bar.push(1);
			foo?.bar.push(2);
		`,
		{
			code: outdent`
				(foo as any[]).push(1);
				(foo as any[]).push(2);
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				foo!.push(1);
				foo!.push(2);
			`,
			languageOptions: {parser: parsers.typescript},
		},
		// A receiver that is known to be an array must still be reported
		{
			code: 'function f(foo: number[]) { foo.push(1); foo.push(2); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

// `Array#unshift()`
test.snapshot({
	valid: [
		// Known non-array receiver (type information)
		{
			code: 'function f(foo: {unshift(value: number): void}) { foo.unshift(1); foo.unshift(2); }',
			languageOptions: {parser: parsers.typescript},
		},
		'foo.unshift(1);',
		outdent`
			foo.push(1);
			foo.unshift(2);
		`,
		outdent`
			foo.unshift(1);
			foo.push(2);
		`,
		outdent`
			foo.unshift(1);; // <- there is a "EmptyStatement" between
			foo.unshift(2);
		`,
		// Not same array
		outdent`
			foo.unshift(1);
			bar.unshift(2);
		`,
		// `.unshift` selector
		'foo.unshift(1);unshift(2)',
		'unshift(1);foo.unshift(2)',
		'new foo.unshift(1);foo.unshift(2)',
		'foo.unshift(1);new foo.unshift(2)',
		'foo[unshift](1);foo.unshift(2)',
		'foo.unshift(1);foo[unshift](2)',
		'foo.unshift(foo.unshift(1));',
		// Not `ExpressionStatement`
		outdent`
			const length = foo.unshift(1);
			foo.unshift(2);
		`,
		outdent`
			foo.unshift(1);
			const length = foo.unshift(2);
		`,
		// Not considered same array
		outdent`
			foo().unshift(1);
			foo().unshift(2);
		`,
		outdent`
			foo().bar.unshift(1);
			foo().bar.unshift(2);
		`,
		// Ignored
		outdent`
			const stream = new Readable();
			stream.unshift('one string');
			stream.unshift('another string');
		`,
		outdent`
			class FooReadable extends Readable {
				unshiftAndEnd(chunk) {
					this.unshift(chunk);
					this.unshift(null);
				}
			}
		`,
		outdent`
			class Foo {
				unshiftAndEnd(chunk) {
					this.stream.unshift(chunk);
					this.stream.unshift(null);
				}
			}
		`,
		outdent`
			process.stdin.unshift(chunk);
			process.stdin.unshift(null);
		`,
		outdent`
			process.stdout.unshift(chunk);
			process.stdout.unshift(null);
		`,
		outdent`
			process.stderr.unshift(chunk);
			process.stderr.unshift(null);
		`,
		{
			code: outdent`
				foo.unshift(1);
				foo.unshift(2);
				foo.bar.unshift(1);
				foo.bar.unshift(2);
			`,
			options: [
				{
					ignore: ['foo.unshift', 'foo.bar.unshift'],
				},
			],
		},
		'for (const _ of []) foo.unshift(bar);',
		outdent`
			function bar() {}
			foo.unshift(bindEvents);
		`,
		outdent`
			foo.unshift?.(1);
			foo.unshift?.(2);
		`,
		// Does not allow optional call
		outdent`
			foo.unshift(1);
			foo.unshift?.(2);
		`,
		outdent`
			foo.unshift?.(1);
			foo.unshift(2);
		`,
		// A `new Foo()` receiver other than `new Array()` is a known non-array
		'const foo = new Foo(); foo.unshift(1); foo.unshift(2);',
	],
	invalid: [
		outdent`
			foo.unshift(1);
			foo.unshift(2);
		`,
		outdent`
			(foo.unshift)(1);
			(foo.unshift)(2);
		`,
		outdent`
			foo.bar.unshift(1);
			foo.bar.unshift(2);
		`,
		outdent`
			foo.unshift(1);
			(foo).unshift(2);
		`,
		outdent`
			bar()
			foo.unshift(1);
			(foo).unshift(2);
		`,
		outdent`
			foo.unshift();
			foo.unshift();
		`,
		outdent`
			foo.unshift(1);
			foo.unshift();
		`,
		outdent`
			foo.unshift();
			foo.unshift(2);
		`,
		outdent`
			foo.unshift(1, 2);
			foo.unshift((3), (4));
		`,
		outdent`
			foo.unshift(1, 2,);
			foo.unshift(3, 4);
		`,
		outdent`
			foo.unshift(1, 2);
			foo.unshift(3, 4,);
		`,
		outdent`
			foo.unshift(1, 2,);
			foo.unshift(3, 4,);
		`,
		outdent`
			foo.unshift(1, 2, ...a,);
			foo.unshift(...b,);
		`,
		// `arguments` in first unshift has side effect
		outdent`
			foo.unshift(bar());
			foo.unshift(1);
		`,
		// `arguments` in second unshift has side effect
		outdent`
			foo.unshift(1);
			foo.unshift(bar());
		`,
		outdent`
			foo.unshift(x);
			foo.unshift(foo.length);
		`,
		outdent`
			foo.unshift(1);
			// Keep this comment
			foo.unshift(2);
		`,
		// Multiple
		outdent`
			foo.unshift(1,);
			foo.unshift(2,);
			foo.unshift(3,);
		`,
		// Should be able to find the previous expression
		outdent`
			if (a) {
				foo.unshift(1);
				foo.unshift(2);
			}
		`,
		outdent`
			switch (a) {
				default:
					foo.unshift(1);
					foo.unshift(2);
			}
		`,
		outdent`
			function a() {
				foo.unshift(1);
				foo.unshift(2);
			}
		`,
		// ASI
		outdent`
			foo.unshift(1)
			foo.unshift(2)
			;[foo].forEach(bar)
		`,
		// Still same array
		outdent`
			foo.bar.unshift(1);
			(foo)['bar'].unshift(2);
		`,
		outdent`
			foo.unshift(1);
			foo?.unshift(2);
		`,
		outdent`
			foo.unshift(1);
			foo?.unshift(2,);
		`,
		outdent`
			foo?.unshift(1);
			foo.unshift(2);
		`,
		outdent`
			foo?.unshift(1);
			foo?.unshift(2);
		`,
		outdent`
			foo?.bar.unshift(1);
			foo?.bar.unshift(2);
		`,
		{
			code: outdent`
				(foo as any[]).unshift(1);
				(foo as any[]).unshift(2);
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				foo!.unshift(1);
				foo!.unshift(2);
			`,
			languageOptions: {parser: parsers.typescript},
		},
		// A receiver that is known to be an array must still be reported
		{
			code: 'function f(foo: number[]) { foo.unshift(1); foo.unshift(2); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

// `Element#classList.{add,remove}()`
test.snapshot({
	valid: [
		outdent`
			foo.classList.toggle('foo');
			foo.classList.toggle('bar');
		`,
		'foo.classList.add("foo");',
		outdent`
			foo.classList.add("foo");
			foo.classList.remove("bar");
		`,
		outdent`
			foo.classList.add("foo");; // <- there is a "EmptyStatement" between
			foo.classList.add("bar");
		`,
		// Not same element
		outdent`
			foo.classList.add("foo");
			bar.classList.add("bar");
		`,
		// `.add` selector
		'foo.classList.add("foo");add("bar")',
		'add("foo");foo.classList("bar")',
		'new foo.classList.add("foo");foo.classList.add("bar")',
		'foo.classList.add("foo");new foo.classList.add("bar")',
		'foo.classList[add]("foo");foo.classList.add("bar")',
		'foo.classList.add("foo");foo.classList[add]("bar");',
		'foo.classList.add(foo.classList.add("foo"));',
		// `.classList` elector
		outdent`
			foo.classList.add("foo");
			foo[classList].add("bar");
		`,
		outdent`
			foo.classList.add("foo");
			classList.add("bar");
		`,
		outdent`
			foo.classList.add("foo");
			(new foo.classList).add("bar");
		`,
		outdent`
			foo.classList.add("foo");
			foo.classList.add?.("bar");
		`,
		outdent`
			foo.notClassList.add("foo");
			foo.notClassList.add("bar");
		`,
		outdent`
			classList.add("foo");
			classList.add("bar");
		`,
		// Not `ExpressionStatement`
		outdent`
			const _ = foo.classList.add("foo");
			foo.classList.add("bar");
		`,
		outdent`
			foo.classList.add("foo");
			const _ = foo.classList.add("bar");
		`,
		// Not considered same array
		outdent`
			foo().classList.add("foo");
			foo().classList.add("bar");
		`,
		outdent`
			foo().bar.classList.add("foo");
			foo().bar.classList.add("bar");
		`,
		// Optional
		outdent`
			foo.classList?.add("foo");
			foo.classList.add("bar");
		`,
		outdent`
			foo.classList.add("foo");
			foo.classList?.add("bar");
		`,
		outdent`
			foo.classList.add?.("foo");
			foo.classList.add("bar");
		`,
		outdent`
			foo.classList.add("foo");
			foo.classList.add?.("bar");
		`,
		outdent`
			foo.classList?.remove("foo");
			foo.classList.remove("bar");
		`,
		outdent`
			foo.classList.remove("foo");
			foo.classList?.remove("bar");
		`,
		outdent`
			foo.classList.remove?.("foo");
			foo.classList.remove("bar");
		`,
		outdent`
			foo.classList.remove("foo");
			foo.classList.remove?.("bar");
		`,
	],
	invalid: [
		outdent`
			foo.classList.add("foo");
			foo.classList.add("bar");
		`,
		outdent`
			foo.classList.remove("foo");
			foo.classList.remove("bar");
		`,
		outdent`
			(foo.classList.add)("foo");
			(foo.classList.add)("bar");
		`,
		outdent`
			foo.bar.classList.add("foo");
			foo.bar.classList.add("bar");
		`,
		outdent`
			foo.classList.add("foo");
			(foo).classList.add("bar");
		`,
		outdent`
			foo.classList.add();
			foo.classList.add();
		`,
		outdent`
			foo.classList.add("foo");
			foo.classList.add();
		`,
		outdent`
			foo.classList.add();
			foo.classList.add(2);
		`,
		outdent`
			foo.classList.add(a, b);
			foo.classList.add((c), (d));
		`,
		outdent`
			foo.classList.add.push(a, b,);
			foo.classList.add.push(c, d);
		`,
		outdent`
			foo.classList.add(a, b);
			foo.classList.add(c, d,);
		`,
		outdent`
			foo.classList.add(a, b,);
			foo.classList.add(c, d,);
		`,
		outdent`
			foo.classList.add(a, b, ...c,);
			foo.classList.add(...d,);
		`,
		outdent`
			foo.classList.add(bar());
			foo.classList.add("foo");
		`,
		// `arguments` in second call has side effect
		outdent`
			foo.classList.add(a);
			foo.classList.add(bar());
		`,
		// Multiple
		outdent`
			foo.classList.add(a,);
			foo.classList.add(b,);
			foo.classList.add(c,);
		`,
		// Should be able to find the previous expression
		outdent`
			if (a) {
				foo.classList.add(a);
				foo.classList.add(b);
			}
		`,
		outdent`
			switch (a) {
				default:
					foo.classList.add(a);
					foo.classList.add(b);
			}
		`,
		outdent`
			function _() {
				foo.classList.add(a);
				foo.classList.add(b);
			}
		`,
		// ASI
		outdent`
			foo.classList.add(a)
			foo.classList.add(b)
			;[foo].forEach(bar)
		`,
		// Still same reference
		outdent`
			foo.bar.classList.add(a);
			(foo)['bar'].classList.add(b);
		`,
		outdent`
			foo?.classList.add("foo");
			foo.classList.add("bar");
		`,
		outdent`
			foo.classList.add("foo");
			foo?.classList.add("bar");
		`,
		outdent`
			foo?.classList.add("foo");
			foo?.classList.add("bar");
		`,
	],
});

// `importScripts()`
test.snapshot({
	valid: [
		outdent`
			importScripts('foo.js');
			notImportScripts('bar.js');
		`,
		'importScripts("foo.js");',
		outdent`
			importScripts("foo.js");; // <- there is a "EmptyStatement" between
			importScripts("bar.js");
		`,
		// `.add` selector
		'new importScripts("foo.js");importScripts("bar.js")',
		'importScripts("foo.js");new importScripts("bar.js")',
		// Not `ExpressionStatement`
		outdent`
			const _ = importScripts("foo.js");
			importScripts("bar.js");
		`,
		outdent`
			importScripts("foo.js");
			const _ = importScripts("bar.js");
		`,
		{
			code: outdent`
				importScripts("foo.js");
				importScripts("bar.js");
			`,
			options: [
				{
					ignore: ['importScripts'],
				},
			],
		},
	],
	invalid: [
		outdent`
			importScripts("foo.js");
			importScripts("bar.js");
		`,
		outdent`
			(importScripts)("foo.js");
			(importScripts)("bar.js");
		`,
		outdent`
			importScripts();
			importScripts();
		`,
		outdent`
			importScripts("foo.js");
			importScripts();
		`,
		outdent`
			importScripts();
			importScripts(2);
		`,
		outdent`
			importScripts(a, b);
			importScripts((c), (d));
		`,
		outdent`
			importScripts(a, b,);
			importScripts(c, d);
		`,
		outdent`
			importScripts(a, b);
			importScripts(c, d,);
		`,
		outdent`
			importScripts(a, b,);
			importScripts(c, d,);
		`,
		outdent`
			foo.classList.add(a, b, ...c,);
			foo.classList.add(...d,);
		`,
		outdent`
			importScripts(bar());
			importScripts("foo.js");
		`,
		// `arguments` in second call has side effect
		outdent`
			importScripts(a);
			importScripts(bar());
		`,
		// Multiple
		outdent`
			importScripts(a,);
			importScripts(b,);
			importScripts(c,);
		`,
		// Should be able to find the previous expression
		outdent`
			if (a) {
				importScripts(a);
				importScripts(b);
			}
		`,
		outdent`
			switch (a) {
				default:
					importScripts(a);
					importScripts(b);
			}
		`,
		outdent`
			function _() {
				importScripts(a);
				importScripts(b);
			}
		`,
		// ASI
		outdent`
			importScripts(a)
			importScripts(b)
			;[foo].forEach(bar)
		`,
		outdent`
			importScripts?.("foo.js");
			importScripts("bar.js");
		`,
		outdent`
			importScripts("foo.js");
			importScripts?.("bar.js");
		`,
		outdent`
			importScripts?.("foo.js");
			importScripts?.("bar.js");
		`,
	],
});

// `isSameReference` coverage
test({
	valid: [
		outdent`
			'1'.someMagicPropertyReturnsAnArray.push(1);
			(1).someMagicPropertyReturnsAnArray.push(2);

			/a/i.someMagicPropertyReturnsAnArray.push(1);
			/b/g.someMagicPropertyReturnsAnArray.push(2);

			1n.someMagicPropertyReturnsAnArray.push(1);
			2n.someMagicPropertyReturnsAnArray.push(2);

			(true).someMagicPropertyReturnsAnArray.push(1);
			(false).someMagicPropertyReturnsAnArray.push(2);
		`,
	],
	invalid: [
		{
			code: outdent`
				class A extends B {
					foo() {
						this.x.push(1);
						this.x.push(2);

						super.x.push(1);
						super.x.push(2);

						((a?.x).y).push(1);
						(a.x?.y).push(1);

						((a?.x.y).z).push(1);
						((a.x?.y).z).push(1);

						a[null].push(1);
						a['null'].push(1);

						'1'.someMagicPropertyReturnsAnArray.push(1);
						'1'.someMagicPropertyReturnsAnArray.push(2);

						/a/i.someMagicPropertyReturnsAnArray.push(1);
						/a/i.someMagicPropertyReturnsAnArray.push(2);

						1n.someMagicPropertyReturnsAnArray.push(1);
						1n.someMagicPropertyReturnsAnArray.push(2);

						(true).someMagicPropertyReturnsAnArray.push(1);
						(true).someMagicPropertyReturnsAnArray.push(2);
					}
				}
			`,
			output: outdent`
				class A extends B {
					foo() {
						this.x.push(1, 2);

						super.x.push(1, 2);

						((a?.x).y).push(1, 1);

						((a?.x.y).z).push(1, 1);

						a[null].push(1, 1);

						'1'.someMagicPropertyReturnsAnArray.push(1, 2);

						/a/i.someMagicPropertyReturnsAnArray.push(1, 2);

						1n.someMagicPropertyReturnsAnArray.push(1, 2);

						(true).someMagicPropertyReturnsAnArray.push(1, 2);
					}
				}
			`,
			errors: 9,
		},
		{
			code: outdent`
				a[x].push(1);
				a[x].push(2);
			`,
			output: outdent`
				a[x].push(1, 2);
			`,
			errors: 1,
		},
	],
});
