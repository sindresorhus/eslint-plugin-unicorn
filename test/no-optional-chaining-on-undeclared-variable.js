import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'let foo; foo?.bar;',
		'function fn(foo) { foo?.(); }',
		{
			code: 'foo?.bar;',
			languageOptions: {
				globals: {
					foo: 'readonly',
				},
			},
		},
		'globalThis.foo?.bar;',
		'globalThis.foo?.();',
		'getFoo()?.bar;',
		'(foo || bar)?.baz;',
		'this?.foo;',
		'foo().bar?.baz;',
		'let foo; foo?.[bar];',
		'let foo; foo?.(bar);',
		outdent`
			class Foo extends Bar {
				method() {
					super.foo?.();
				}
			}
		`,
		outdent`
			let foo;
			function fn() {
				foo?.bar;
			}
		`,
	],
	invalid: [
		'foo?.bar;',
		'foo?.();',
		'foo?.bar();',
		'foo?.bar?.baz;',
		'foo.bar?.();',
		'foo.bar?.baz;',
		'foo?.().bar?.baz;',
		'foo?.bar().baz?.qux;',
		'(foo?.bar)?.baz;',
		'(foo?.bar)?.();',
		'foo?.[bar];',
		outdent`
			function fn() {
				foo?.bar;
			}
		`,
		{
			code: '(foo as Foo)?.bar;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'foo!.bar?.();',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
