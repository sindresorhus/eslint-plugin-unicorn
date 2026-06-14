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
		'let foo = {}; let bar; foo[bar]?.baz;',
		'let foo; let bar; foo?.[bar];',
		'let foo; let bar; foo?.(bar);',
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
		{
			code: 'let foo; (foo?.bar as Foo)?.baz;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'let foo; (foo<string>)?.bar;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'import {foo} from "foo"; foo?.bar;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type foo = {}; const foo = {}; foo?.bar;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type foo = {}; foo?.bar;',
			languageOptions: {
				parser: parsers.typescript,
				globals: {
					foo: 'readonly',
				},
			},
		},
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
		'foo[bar]?.baz;',
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
		{
			code: '(foo?.bar as Foo)?.baz;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(foo<string>)?.bar;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(foo<string>)?.();',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(foo<string>).bar?.baz;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type foo = {}; foo?.bar;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'interface foo {} foo?.bar;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'import type {foo} from "foo"; foo?.bar;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'import {type foo} from "foo"; foo.bar?.baz;',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
