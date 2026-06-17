import outdent from 'outdent';
import {getTester} from './utils/test.js';
import parsers from './utils/parsers.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const object = {foo: 1}; if (object.foo) {}',
		'const object = Object.fromEntries(entries);',
		'const object = Object.fromEntries(entries); object.foo;',
		'const object = Object.fromEntries([[1, value]]); object["1"];',
		'const object = Object.fromEntries([["1", value]]); object["1"];',
		'const object = Object.fromEntries([["2", "b"], ["1", "a"]]); Object.keys(object);',
		'let object = Object.fromEntries(Object.entries(source)); object.foo;',
		'const {object} = Object.fromEntries(Object.entries(source)); object.foo;',
		'const object = Object.fromEntries(Object.entries(source)); object[key];',
		'const object = Object.fromEntries(Object.entries(source)); object[0];',
		'const object = Object.fromEntries(Object.entries(source)); object["1"];',
		// The maximum array index (2**32 - 2) is still an index, not a key
		'const object = Object.fromEntries([["4294967294", value]]); object["4294967294"];',
		'const object = Object.fromEntries(Object.entries(source)); object["1"] = value; Object.keys(object);',
		'const object = Object.fromEntries(Object.entries(source)); object.constructor;',
		'const object = Object.fromEntries(Object.entries(source)); object.toString;',
		'const object = Object.fromEntries(Object.entries(source)); object.__proto__;',
		'const object = Object.fromEntries(Object.entries(source)); key in object;',
		'const object = Object.fromEntries(Object.entries(source)); Reflect.has(object, key);',
		'const object = Object.fromEntries(Object.entries(source)); foo(object);',
		'const object = Object.fromEntries(Object.entries(source)); object.foo; foo(object);',
		'function foo() { const object = Object.fromEntries(Object.entries(source)); return object; }',
		'const object = Object.fromEntries(Object.entries(source)); ({...object});',
		'const object = Object.fromEntries(Object.entries(source)); [...object];',
		'const object = Object.fromEntries(Object.entries(source)); foo(...object);',
		'const object = Object.fromEntries(Object.entries(source)); const {foo} = object;',
		'const object = Object.fromEntries(Object.entries(source)); ({foo: object.bar} = source);',
		'const object = Object.fromEntries(Object.entries(source)); [object.foo] = source;',
		'const object = Object.fromEntries(Object.entries(source)); object.foo();',
		'const object = Object.fromEntries(Object.entries(source)); new object.foo();',
		'const object = Object.fromEntries(Object.entries(source)); new object.foo.bar();',
		'const object = Object.fromEntries(Object.entries(source)); new (object.foo).bar();',
		'const object = Object.fromEntries(Object.entries(source)); new object["foo"].bar();',
		'const object = Object.fromEntries(Object.entries(source)); object.foo`tag`;',
		'const object = Object.fromEntries(Object.entries(source)); for (object.foo in source) {}',
		'const object = Object.fromEntries(Object.entries(source)); object.foo += 1;',
		'const object = Object.fromEntries(Object.entries(source)); object.foo++;',
		'const object = Object.fromEntries(Object.entries(source)); object?.foo;',
		'const object = Object.fromEntries(Object.entries(source)); Object.hasOwn(object, object.foo);',
		'const object = Object.fromEntries(Object.entries(source)); object.foo = object.bar;',
		'const object = Object.fromEntries(Object.entries(source)); const deleted = delete object.foo;',
		'const object = Object.fromEntries(Object.entries(source)); Object.keys(/* comment */ object);',
		'const object = Object.fromEntries(Object.entries(source)); object /* comment */ .foo;',
		'const object = Object /* comment */ .fromEntries(Object.entries(source)); object.foo;',
		'const object = Object.fromEntries(Object.entries(source)); Object.hasOwn(object, key);',
		'const object = Object.fromEntries(Object.entries(source)); object.foo /* comment */ = value;',
		'const object = Object.fromEntries(Object.entries(source)); delete /* comment */ object.foo;',
		'const object = Object.fromEntries(...entries); object.foo;',
		'const object = Object.fromEntries(entries, extra); object.foo;',
		'const object = Object.fromEntries?.(entries); object.foo;',
		'const object = Object?.fromEntries(entries); object.foo;',
		'const object = NotObject.fromEntries(entries); object.foo;',
		'export const object = Object.fromEntries(Object.entries(source)); object.foo;',
		'const object = Object.fromEntries(Object.entries(source)); export {object}; object.foo;',
		'const Object = {fromEntries: entries => ({})}; const object = Object.fromEntries([["foo", value]]); object.foo;',
		'const Map = function () {}; const object = Object.fromEntries([["foo", value]]); object.foo;',
		{
			code: 'const object: Record<string, unknown> = Object.fromEntries(Object.entries(source)); object.foo;',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const object = Object.fromEntries<string, unknown>(Object.entries(source)); object.foo;',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const object = Object.fromEntries(Object.entries(source)); object.foo!;',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const object = Object.fromEntries(Object.entries(source)); object.foo!();',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const object = Object.fromEntries(Object.entries(source)); object.foo!++;',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const object = Object.fromEntries(Object.entries(source)); new object.foo!.bar();',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const object = Object.fromEntries(Object.entries(source)); (object.foo as string);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const object = Object.fromEntries(Object.entries(source)); (object.foo satisfies string);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const object = Object.fromEntries(Object.entries(source)); object.foo<string>();',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const object = Object.fromEntries(Object.entries(source)); new (object.foo).bar!.baz();',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'const object = Object.fromEntries(Object.entries(source)); new ((object.foo).bar as Constructor).baz();',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
	invalid: [
		'const object = Object.fromEntries([["foo", value]]); object.foo;',
		// A hex string is not a canonical array index, so it's a real key
		'const object = Object.fromEntries([["0x1", value]]); object["0x1"];',
		// One past the maximum array index (2**32 - 1) is a real key
		'const object = Object.fromEntries([["4294967295", value]]); object["4294967295"];',
		// Parenthesized `Object.entries` argument
		'const object = Object.fromEntries((Object.entries(source))); object.foo;',
		'const object = Object.fromEntries(Object.entries(source)); object["foo"];',
		'const object = Object.fromEntries(Object.entries(source)); object[`foo`];',
		'const object = Object.fromEntries(Object.entries(source)); if (object.foo) {}',
		'const object = Object.fromEntries(Object.entries(source)); Object.hasOwn(object, "foo");',
		'const object = Object.fromEntries(Object.entries(source)); Object.hasOwn(object, `foo`);',
		'const object = Object.fromEntries(Object.entries(source)); object.foo = value;',
		'const object = Object.fromEntries(Object.entries(source)); object.foo = (bar, baz);',
		'const object = Object.fromEntries(Object.entries(source)); object["foo"] = value;',
		'const object = Object.fromEntries(Object.entries(source)); new (foo(object.bar))();',
		{
			code: 'const object = Object.fromEntries(Object.entries(source)); object.foo;',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		'const object = Object.fromEntries(Object.entries(source)); delete object.foo;',
		'const object = Object.fromEntries(Object.entries(source)); delete object["foo"];',
		'const object = Object.fromEntries(Object.entries(source)); Object.keys(object);',
		'const object = Object.fromEntries(Object.entries(source)); Object.values(object);',
		'const object = Object.fromEntries(Object.entries(source)); Object.entries(object);',
		'function getKeys() { const object = Object.fromEntries(Object.entries(source)); return Object.keys(object); }',
		'function throwKeys() { const object = Object.fromEntries(Object.entries(source)); throw Object.keys(object); }',
		outdent`
			const object = Object.fromEntries(Object.entries(source))
			Object.keys(object);
		`,
		outdent`
			const object = Object.fromEntries(Object.entries(source))
			foo
			Object.keys(object).join();
		`,
		outdent`
			const object = Object.fromEntries(Object.entries(source));
			if (Object.hasOwn(object, 'foo')) {
				console.log(object.foo);
			}
			object.bar = value;
			delete object.baz;
			const keys = Object.keys(object);
		`,
		outdent`
			const object = (Object.fromEntries(
				/* Keep entries. */ [['foo', value]],
			));
			console.log(object.foo);
		`,
	],
});
