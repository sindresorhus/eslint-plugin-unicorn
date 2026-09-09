import {outdent} from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

// Runs with full type information and `checkVaryingBase` enabled, so `const enum` objects can be detected.
const typeAwareVaryingBase = code => ({
	code,
	options: [{checkVaryingBase: true}],
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

const typeAwareComputedMemberAccess = code => ({
	...typeAwareVaryingBase(code),
	options: [{checkComputedMemberAccess: true}],
});

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
		{
			code: 'test ? object.a?.() : object.b?.();',
			options: [{checkComputedMemberAccess: true}],
		},
		'test ? object.call(a) : object.call(b);',
		'test ? call(...a) : call(...b);',
		'test ? getFunction()(a) : getFunction()(b);',
		'test ? tag`a` : tag`b`;',
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
		// Object swaps are off by default: moving the ternary into the base (`(test ? a : b).value`) wraps the receiver in a conditional and breaks TypeScript `const enum` access. Opt in with `checkVaryingBase`.
		'test ? a.value : b.value;',
		'test ? a["x"] : b["x"];',
		// Static property swaps are off by default: `object['a']` is the same logical access as `object.a`, so minimizing them forces or keeps computed access in place of clearer property access.
		'test ? object.a : object.b;',
		'test ? object["a"] : object["b"];',
		'isMac ? event.metaKey : event.ctrlKey;',
		// A statically known computed key is treated as a static property too, so it is not reported by default.
		'test ? c[0] : c[1];',
		// Same-object member swaps with a `this` receiver are not reported by default either.
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
		// `checkComputedMemberAccess` alone does not enable object-varying reads; that needs `checkVaryingBase`.
		{
			code: 'test ? a.value : b.value;',
			options: [{checkComputedMemberAccess: true}],
		},
		// Callee-varying call ternaries are off by default.
		'test ? a() : b();',
		'test ? a(value) : b(value);',
		'test ? first.method(value) : second.method(value);',
		// Method-call ternaries are off by default.
		'test ? Promise.allSettled(values) : Promise.all(values);',
		'test ? Math.min(a, 100) : Math.max(a, 100);',
		// Zero-argument method-call swaps are off by default.
		'test ? c.a() : c.b();',
		// Optional chaining is never reported, even when the option is on.
		{
			code: 'test ? a?.() : b?.();',
			options: [{checkVaryingBase: true}],
		},
		{
			code: 'test ? a?.foo : b?.foo;',
			options: [{checkVaryingBase: true}],
		},
		{
			code: 'test ? Promise?.allSettled(values) : Promise?.all(values);',
			options: [{checkComputedMemberAccess: true}],
		},
		// Differing arguments are never minimal, even when only the method name would otherwise qualify.
		{
			code: 'test ? Promise.allSettled(a) : Promise.all(b);',
			options: [{checkComputedMemberAccess: true}],
		},
		// Even with `checkVaryingBase`, a `const enum` object is not reported: `(test ? Email : Sms).MFA_CODE` is a TypeScript compile error (TS2475). Detected whether the const enum is the consequent, the alternate, or both.
		typeAwareVaryingBase('const enum Email { MFA_CODE } enum Sms { MFA_CODE } declare const test: boolean; test ? Email.MFA_CODE : Sms.MFA_CODE;'),
		typeAwareVaryingBase('enum Email { MFA_CODE } const enum Sms { MFA_CODE } declare const test: boolean; test ? Email.MFA_CODE : Sms.MFA_CODE;'),
		typeAwareVaryingBase('const enum Email { MFA_CODE } const enum Sms { MFA_CODE } declare const test: boolean; test ? Email.MFA_CODE : Sms.MFA_CODE;'),
		// Computed access on a `const enum` is exempt too: `(test ? Email : Sms)["MFA_CODE"]` is also a TS2475 compile error.
		typeAwareVaryingBase('const enum Email { MFA_CODE } enum Sms { MFA_CODE } declare const test: boolean; test ? Email["MFA_CODE"] : Sms["MFA_CODE"];'),
		// A `const enum` reached through an alias is resolved and exempted too.
		typeAwareVaryingBase('const enum Original { MFA_CODE } import Email = Original; enum Sms { MFA_CODE } declare const test: boolean; test ? Email.MFA_CODE : Sms.MFA_CODE;'),
	],
	invalid: [
		'test ? call(a) : call(b);',
		'test ? call(a, b) : call(a, c);',
		'test ? a + 1 : b + 1;',
		'test ? 1 + a : 1 + b;',
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
		// `checkVaryingBase` enables ternaries that differ only by the base of a call or member access.
		{
			code: 'test ? a() : b();',
			options: [{checkVaryingBase: true}],
		},
		{
			code: 'test ? a(value) : b(value);',
			options: [{checkVaryingBase: true}],
		},
		{
			code: 'test ? first.method(value) : second.method(value);',
			options: [{checkVaryingBase: true}],
		},
		// A plain member read where only the object differs.
		{
			code: 'test ? a.value : b.value;',
			options: [{checkVaryingBase: true}],
		},
		{
			code: 'test ? a["x"] : b["x"];',
			options: [{checkVaryingBase: true}],
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
		// The `const enum` exemption is specific: regular enums and plain objects are still reported.
		typeAwareVaryingBase('enum Email { MFA_CODE } enum Sms { MFA_CODE } declare const test: boolean; test ? Email.MFA_CODE : Sms.MFA_CODE;'),
		typeAwareVaryingBase('declare const a: {value: number}, b: {value: number}, test: boolean; test ? a.value : b.value;'),
		{
			code: 'test ? object.a : object.b;',
			options: [{checkComputedMemberAccess: true}],
		},
		{
			code: 'isMac ? event.metaKey : event.ctrlKey;',
			options: [{checkComputedMemberAccess: true}],
		},
	],
});

test.snapshot({
	valid: [
		...[
			'test ? object.a : object.b;',
			'const first = 1, second = 2; test ? object[first] : object[second];',
		].map(code => ({code, options: [{checkComputedMemberAccess: false, checkVaryingBase: true}]})),
		...[
			'test ? object.a : other.b;',
			'test ? object.a : object.a;',
			'test ? object.a : object["a"];',
			'test ? object.a : object[`a`];',
			'test ? object[0] : object["0"];',
			'const first = "a", second = "a"; test ? object[first] : object[second];',
			'test ? target?.a : target?.b;',
			'test ? object.a : object?.b;',
			'test ? object?.["a"] : object?.["b"];',
			'test ? getObject().a : getObject().b;',
			'test ? object.value.a : object.value.b;',
			'test ? object.a : object[key];',
			outdent`
				class Foo {
					#a;
					#b;

					method(test) {
						return test ? this.#a : this.#b;
					}
				}
			`,
		].map(code => ({code, options: [{checkComputedMemberAccess: true}]})),
		{
			code: 'test ? object.a : other.b;',
			options: [{checkComputedMemberAccess: true, checkVaryingBase: true}],
		},
		{
			code: 'test ? object!.a : object!.b;',
			options: [{checkComputedMemberAccess: true}],
			languageOptions: {parser: parsers.typescript},
		},
		typeAwareComputedMemberAccess('const enum Foo { A, B } declare const test: boolean; test ? Foo.A : Foo.B;'),
		typeAwareComputedMemberAccess('const enum Foo { A, B } declare const test: boolean; test ? Foo["A"] : Foo["B"];'),
		typeAwareComputedMemberAccess('const enum Original { A, B } import Foo = Original; declare const test: boolean; test ? Foo.A : Foo.B;'),
	],
	invalid: [
		...[
			'test ? object["a"] : object["b"];',
			'test ? object.a : object["b"];',
			'test ? object[0] : object[1];',
			'test ? object[`a`] : object[`b`];',
			'test ? "value".length : "value".constructor;',
			'test ? this.maxWidth : this.maxHeight;',
			'test ? ((object).a) : (object.b);',
			'test ? object./* first */ a : object./* second */ b;',
			'const first = "a", second = "b"; test ? object[first] : object[second];',
			outdent`
				class Foo extends Bar {
					method(test) {
						return test ? super.foo : super.bar;
					}
				}
			`,
		].map(code => ({code, options: [{checkComputedMemberAccess: true}]})),
		// Dynamic-key swaps remain enabled independently of the option.
		{
			code: 'test ? object[first] : object[second];',
			options: [{checkComputedMemberAccess: false}],
		},
		...[
			'declare const object: {a: number; b: number}, test: boolean; test ? object.a : object.b;',
			// Without type information, const enums retain the existing best-effort behavior.
			'const enum Foo { A, B } declare const test: boolean; test ? Foo.A : Foo.B;',
		].map(code => ({code, options: [{checkComputedMemberAccess: true}], languageOptions: {parser: parsers.typescript}})),
		typeAwareComputedMemberAccess('enum Foo { A, B } declare const test: boolean; test ? Foo.A : Foo.B;'),
		typeAwareComputedMemberAccess('declare const object: {a: number; b: number}, test: boolean; test ? object.a : object.b;'),
	],
});

test.snapshot({
	valid: [
		// Objects must have the same ordinary, non-computed properties in the same order.
		'test ? {} : {};',
		'test ? {a: 1} : {a: 1};',
		'test ? {a: 1} : {b: 2};',
		'test ? {a: 1, b: 2} : {a: 1};',
		'test ? {a: 1, b: 2} : {b: 3, a: 1};',
		'test ? {a: 1, b: 2} : {a: 3, b: 4};',
		'test ? {[key]: 1} : {[key]: 2};',
		'test ? {a: 1} : {["a"]: 2};',
		'test ? {...object, a: 1} : {...object, a: 2};',
		'test ? {a() {return 1;}} : {a() {return 2;}};',
		'test ? {get a() {return 1;}} : {get a() {return 2;}};',
		'test ? {set a(value) {}, b: 1} : {set a(value) {}, b: 2};',
		// Prototype setters and shorthand properties have different object semantics.
		'test ? {__proto__} : {__proto__: other};',
		'test ? {__proto__: other} : {__proto__};',
		'test ? {__proto__: a} : {__proto__: b};',
		'test ? {"__proto__": a} : {"__proto__": b};',
		'test ? {a: other ? 1 : 2} : {a: 3};',
		'test ? {a: 1} : {a: other ? 2 : 3};',
		// Shared expressions before the varying value must be safe to move before the condition.
		'test ? {a: call(), b: 1} : {a: call(), b: 2};',
		'test ? {a: object.value, b: 1} : {a: object.value, b: 2};',
		'test ? [call(), 1] : [call(), 2];',
		'test ? [other ? b : c, a] : [other ? b : c, d];',
		'test ? new Foo(call(), 1) : new Foo(call(), 2);',
		// Arrays must have the same length, with no spreads or holes.
		'test ? [] : [];',
		'test ? [1] : [1];',
		'test ? [1, 2] : [1];',
		'test ? [1, 2] : [3, 4];',
		'test ? [...items, 1] : [...items, 2];',
		'test ? [a] : [...b];',
		'test ? [, 1] : [, 2];',
		'test ? [1, 2] : [, 3];',
		'test ? [other ? 1 : 2] : [3];',
		'test ? [1] : [other ? 2 : 3];',
		// Constructor changes, member constructors, and spreads are not supported.
		'test ? new Foo() : new Foo();',
		'test ? new Foo(a) : new Foo(a);',
		'test ? new Foo(a) : new Bar(b);',
		'test ? new Foo(a) : new Foo(a, b);',
		'test ? new Foo(a, b) : new Foo(c, d);',
		'test ? new namespace.Foo(a) : new namespace.Foo(b);',
		'test ? new Foo(...a) : new Foo(...b);',
		'test ? new Foo(a) : new Foo(...b);',
		'test ? new Foo(other ? a : b) : new Foo(c);',
		'test ? new Foo(a) : new Foo(other ? b : c);',
		'test ? new Foo(a) : Foo(b);',
		...[
			'test ? new Foo<A>(a) : new Foo<B>(b);',
			'test ? new Foo<A>(a) : new Foo(b);',
			'test ? new Foo(a) : new Foo<A>(b);',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	],
	invalid: [
		'test ? {a: 1} : {a: 2};',
		'test ? {a: 1, b: 2} : {a: 1, b: 3};',
		'test ? {a} : {a: b};',
		'test ? {a: b} : {a};',
		'test ? {a, b: 1} : {a, b: 2};',
		'test ? {"a": 1} : {a: 2};',
		'test ? {0: a} : {0: b};',
		'test ? {a: 1, b: call()} : {a: 2, b: call()};',
		'test ? ({a: (1)}) : ({a: (2)});',
		'test ? {a: /* first */ 1} : {a: /* second */ 2};',
		'test ? [1] : [2];',
		'test ? [1, 2] : [1, 3];',
		'test ? [a, 1, b] : [a, 2, b];',
		'test ? [1, call()] : [2, call()];',
		'test ? ([((a))]) : ([(b)]);',
		'test ? [/* first */ 1] : [/* second */ 2];',
		'consume(test ? [1] : [2]);',
		'test ? new Foo(a) : new Foo(b);',
		'test ? new Date(2026, 1) : new Date(2026, 2);',
		'test ? new Foo(a, call()) : new Foo(b, call());',
		'test ? new (Foo)((a)) : new (Foo)((b));',
		'test ? new Foo(/* first */ a) : new Foo(/* second */ b);',
		...[
			'test ? new Foo<Value>(a) : new Foo<Value>(b);',
			'test ? new Foo<A, B>(a) : new Foo<A, B>(b);',
			'test ? {a: value as A} : {a: other as A};',
			'test ? [value!] : [other!];',
			'test ? new Foo(value satisfies A) : new Foo(other satisfies A);',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
		'test ? {__proto__, a: 1} : {__proto__, a: 2};',
		'test ? [a, other ? b : c] : [d, other ? b : c];',
	],
});
