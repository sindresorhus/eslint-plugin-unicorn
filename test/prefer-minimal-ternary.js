import {outdent} from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'test ? a : b;',
		'test ? call(a) : call(b, c);',
		'test ? call(a, b) : call(c, d);',
		'test ? a + 1 : b - 1;',
		'test ? a + 1 : b + 2;',
		'test ? object.a : other.b;',
		'test ? getObject().a : getObject().b;',
		'test ? object[method] : object[otherMethod];',
		'test ? object?.a : object?.b;',
		// Different objects with optional chaining are not reported, even though the property is shared.
		'test ? a?.foo : b?.foo;',
		'test ? object.a?.() : object.b?.();',
		'test ? object.call(a) : object.call(b);',
		'test ? call(...a) : call(...b);',
		'test ? getFunction()(a) : getFunction()(b);',
		'test ? tag`a` : tag`b`;',
		'test ? new Foo(a) : new Foo(b);',
		'test ? (a, b) : (a, c);',
		'test ? a && b : a && c;',
		'test ? getValue() + a : getValue() + b;',
		'test ? a + b : a + b;',
		'test ? call(a ? b : c) : call(d ? e : f);',
		outdent`
			test
				? object.one(a, b)
				: other.two(a, b);
		`,
		outdent`
			class Foo extends Bar {
				method() {
					return test ? super.foo : object.foo;
				}
			}
		`,
		outdent`
			class Foo extends Bar {
				method() {
					return test ? super.foo(value) : object.foo(value);
				}
			}
		`,
		outdent`
			class Foo {
				#a;
				#b;

				method(test, object) {
					return test ? #a in object : #b in object;
				}
			}
		`,
		// Bare member swaps are never reported: minimizing them requires computed member access, which is not an improvement.
		'test ? object.a : object.b;',
		'test ? object["a"] : object["b"];',
		'isMac ? event.metaKey : event.ctrlKey;',
		// Same-object member swaps with a `this` receiver are not reported either.
		'test ? this.maxWidth : this.maxHeight;',
		{
			code: 'test ? object.a : object.b;',
			options: [{checkComputedMemberAccess: true}],
		},
		{
			code: 'isMac ? event.metaKey : event.ctrlKey;',
			options: [{checkComputedMemberAccess: true}],
		},
		// Method-call ternaries are off by default.
		'test ? Promise.allSettled(values) : Promise.all(values);',
		'test ? Math.min(a, 100) : Math.max(a, 100);',
		// Zero-argument method-call swaps are off by default.
		'test ? c.a() : c.b();',
		// Optional chaining is never reported, even when the option is on.
		{
			code: 'test ? Promise?.allSettled(values) : Promise?.all(values);',
			options: [{checkComputedMemberAccess: true}],
		},
		// Differing arguments are never minimal, even when only the method name would otherwise qualify.
		{
			code: 'test ? Promise.allSettled(a) : Promise.all(b);',
			options: [{checkComputedMemberAccess: true}],
		},
	],
	invalid: [
		'test ? call(a) : call(b);',
		'test ? call(a, b) : call(a, c);',
		'test ? a() : b();',
		'test ? a(value) : b(value);',
		'test ? first.method(value) : second.method(value);',
		'test ? a + 1 : b + 1;',
		'test ? 1 + a : 1 + b;',
		'test ? a.value : b.value;',
		// Computed access with a static property minimizes when only the object differs.
		'test ? a["x"] : b["x"];',
		// `checkComputedMemberAccess` enables method-call ternaries that differ only by the method name.
		{
			code: 'test ? Promise.allSettled(values) : Promise.all(values);',
			options: [{checkComputedMemberAccess: true}],
		},
		{
			code: 'test ? Math.min(a, 100) : Math.max(a, 100);',
			options: [{checkComputedMemberAccess: true}],
		},
		// Opt-in still reports zero-argument method-call swaps.
		{
			code: 'test ? c.a() : c.b();',
			options: [{checkComputedMemberAccess: true}],
		},
		// The object is already accessed with a computed string, so minimizing is a clear improvement.
		{
			code: 'test ? Promise["allSettled"](values) : Promise["all"](values);',
			options: [{checkComputedMemberAccess: true}],
		},
		{
			code: outdent`
				await (
					delayRejection
						? Promise.allSettled([
							promise,
							delay(minimumDelay),
						])
						: Promise.all([
							promise,
							delay(minimumDelay),
						])
				);
			`,
			options: [{checkComputedMemberAccess: true}],
		},
		{
			code: 'test ? Promise.allSettled<T>(values) : Promise.all<T>(values);',
			options: [{checkComputedMemberAccess: true}],
			languageOptions: {parser: parsers.typescript},
		},
	],
});
