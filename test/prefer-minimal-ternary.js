import {outdent} from 'outdent';
import {getTester} from './utils/test.js';

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
	],
	invalid: [
		'test ? call(a) : call(b);',
		'test ? call(a, b) : call(a, c);',
		'test ? a() : b();',
		'test ? a(value) : b(value);',
		'test ? Promise.allSettled(values) : Promise.all(values);',
		'test ? Math.min(a, 100) : Math.max(a, 100);',
		'test ? first.method(value) : second.method(value);',
		'test ? a + 1 : b + 1;',
		'test ? 1 + a : 1 + b;',
		'test ? object.a : object.b;',
		'test ? object["a"] : object["b"];',
		'test ? a.value : b.value;',
		outdent`
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
	],
});
