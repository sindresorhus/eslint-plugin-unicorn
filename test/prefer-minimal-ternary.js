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
		'test ? object?.a : object?.b;',
		// Dynamic computed-key swaps are only minimized when the object is the same and side-effect-free.
		'test ? a[x] : b[x];',
		'test ? c?.[x] : c?.[y];',
		'test ? getObject()[x] : getObject()[y];',
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
		// Static property swaps are never reported: `object['a']` is the same logical access as `object.a`, so minimizing them forces or keeps computed access in place of clearer property access.
		'test ? object.a : object.b;',
		'test ? object["a"] : object["b"];',
		'isMac ? event.metaKey : event.ctrlKey;',
		// A statically known computed key is treated as a static property too, so it is not reported.
		'test ? c[0] : c[1];',
		// Same-object member swaps with a `this` receiver are not reported either.
		'test ? this.maxWidth : this.maxHeight;',
		// Private fields have no static name, but can't be made computed, so they are not reported.
		outdent`
			class Foo {
				#a;
				#b;

				method(test, object) {
					return test ? object.#a : object.#b;
				}
			}
		`,
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
		// Same object with a dynamic computed key minimizes to `c[test ? x : y]` with no regression.
		'test ? c[x] : c[y];',
		'test ? object[method] : object[otherMethod];',
		'test ? c[f()] : c[g()];',
		// A `this` receiver with a dynamic key minimizes too.
		'test ? this[x] : this[y];',
		// A `super` receiver stays in place, so the dynamic key minimizes.
		outdent`
			class Foo extends Bar {
				method() {
					return test ? super[x] : super[y];
				}
			}
		`,
		// A TypeScript non-null assertion on the key is still a dynamic key.
		{
			code: 'test ? c[x!] : c[y!];',
			languageOptions: {parser: parsers.typescript},
		},
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
