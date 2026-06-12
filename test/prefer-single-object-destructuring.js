import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const {bar, baz} = foo;',
		outdent`
			const {bar} = foo;
			const {baz} = foo;
		`,
		outdent`
			let foo = {};
			const {bar} = foo;
			const {baz} = foo;
		`,
		outdent`
			import foo from 'foo';
			const {bar} = foo;
			const {baz} = foo;
		`,
		outdent`
			function unicorn(foo) {
				const {bar} = foo;
				const {baz} = foo;
			}
		`,
		outdent`
			const {bar} = foo;
			let {baz} = foo;
		`,
		outdent`
			var {bar} = foo;
			var {baz} = foo;
		`,
		outdent`
			const {bar} = foo;
			const {baz} = other;
		`,
		outdent`
			const {bar} = foo;
			console.log(bar);
			const {baz} = foo;
		`,
		outdent`
			const {bar} = foo, {baz} = foo;
		`,
		outdent`
			const {bar} = foo.bar;
			const {baz} = foo.bar;
		`,
		outdent`
			const {bar} = foo();
			const {baz} = foo();
		`,
		outdent`
			const {bar, ...rest} = foo;
			const {baz} = foo;
		`,
		outdent`
			const {bar: {qux}} = foo;
			const {baz} = foo;
		`,
		outdent`
			const {bar = 1} = foo;
			const {baz} = foo;
		`,
		outdent`
			const {[bar]: value} = foo;
			const {baz} = foo;
		`,
		outdent`
			const {
				// comment
				bar
			} = foo;
			const {baz} = foo;
		`,
		outdent`
			const {bar} = foo;
			const {
				// comment
				baz
			} = foo;
		`,
		outdent`
			const {bar} = foo;
			// comment
			const {baz} = foo;
		`,
		outdent`
			export const {bar} = foo;
			export const {baz} = foo;
		`,
		{
			code: outdent`
				const {bar}: Foo = foo;
				const {baz}: Foo = foo;
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				declare const {bar}: Foo;
				declare const {baz}: Foo;
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				declare const foo: Foo;
				const {bar} = foo;
				const {baz} = foo;
			`,
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		outdent`
			const foo = {};
			const {bar} = foo;
			const {baz} = foo;
		`,
		outdent`
			const foo = {};
			let {bar} = foo;
			let {baz} = foo;
		`,
		outdent`
			const foo = {};
			const {bar: renamed} = foo;
			const {baz} = foo;
		`,
		outdent`
			const foo = {};
			const {'bar': bar} = foo;
			const {baz} = foo;
		`,
		outdent`
			for (const foo of foos) {
				const {bar} = foo;
				const {baz} = foo;
			}
		`,
		outdent`
			const foo = {};
			const {
				bar
			} = foo;
			const {
				baz
			} = foo;
		`,
		outdent`
			{
				const foo = {};
				const {bar} = foo;
				const {baz} = foo;
			}
		`,
		outdent`
			class Foo {
				static {
					const foo = {};
					const {bar} = foo;
					const {baz} = foo;
				}
			}
		`,
		outdent`
			switch (value) {
				case 1:
					const foo = {};
					const {bar} = foo;
					const {baz} = foo;
			}
		`,
	],
});
