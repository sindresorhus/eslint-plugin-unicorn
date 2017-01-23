import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-type-error';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [{
	ruleId: 'prefer-type-error',
	message: '`new Error()` is too unspecific for a type check. Use `new TypeError()` instead.'
}];

const tcIdentifiers = new Set([
	'isArguments',
	'isArray',
	'isArrayBuffer',
	'isArrayLike',
	'isArrayLikeObject',
	'isBoolean',
	'isBuffer',
	'isDate',
	'isElement',
	'isError',
	'isFinite',
	'isFunction',
	'isInteger',
	'isLength',
	'isMap',
	'isNaN',
	'isNative',
	'isNil',
	'isNull',
	'isNumber',
	'isObject',
	'isObjectLike',
	'isPlainObject',
	'isPrototypeOf',
	'isRegExp',
	'isSafeInteger',
	'isSet',
	'isString',
	'isSymbol',
	'isTypedArray',
	'isUndefined',
	'isView',
	'isWeakMap',
	'isWeakSet',
	'isWindow',
	'isXMLDoc'
]);

const tcIdentifierInvalidTest = identifier => {
	return {
		code: `if (SomeThing.${identifier}(foo) === bar) {
			throw new Error('foo is bar');
		}`,
		output: `if (SomeThing.${identifier}(foo) === bar) {
			throw new TypeError('foo is bar');
		}`,
		errors
	};
};

ruleTester.run('prefer-type-error', rule, {
	valid: [
		`if (MrFuManchu.name !== 'Fu Manchu' || MrFuManchu.isMale === false) {
			throw new Error('How cant Fu Manchu be Fu Manchu?');
		}`,
		`if (Array.isArray(foo) || ArrayBuffer.isView(foo)) {
			throw new TypeError();
		}`,
		`if (wrapper.g.ary.isArray(foo) || wrapper.f.g.ary.isView(foo)) {
			throw new TypeError();
		}`,
		`if (wrapper.g.ary(foo) || wrapper.f.g.ary.isPiew(foo)) {
			throw new Error();
		}`,
		`if (Array.isArray()) {
			throw new Error('Woohoo - isArray is broken!');
		}`,
		`if (Array.isArray(foo) || ArrayBuffer.isView(foo)) {
			throw new CustomError();
		}`,
		`if (Array.isArray(foo)) {
			throw new Error.foo();
		}`,
		`if (Array.isArray(foo)) {
			throw new Error.foo;
		}`,
		`if (Array.isArray(foo)) {
			throw new foo.Error;
		}`,
		`if (Array.isArray(foo)) {
			throw new foo.Error('My name is Foo Manchu');
		}`,
		`if (Array.isArray(foo) || ArrayBuffer.isView(foo)) {
			throw Error('This is fo FooBar', foo);
		}`,
		`if (Array.isArray(foo) || ArrayBuffer.isView(foo)) {
			new Error('This is fo FooBar', foo);
		}`,
		`function test(foo) {
			if (Array.isArray(foo) || ArrayBuffer.isView(foo)) {
				return new Error('This is fo FooBar', foo);
			}
			return foo;
		}`,
		`if (Array.isArray(foo) || ArrayBuffer.isView(foo)) {
			lastError = new Error('This is fo FooBar', foo);
		}`,
		`if (!isFinite(foo)) {
			throw new TypeError();
		}`,
		`if (isNaN(foo)) {
			throw new TypeError();
		}`,
		`if (isArray(foo)) {
			throw new Error();
		}`,
		`if (foo instanceof boo) {
			throw new TypeError();
		}`,
		`if (typeof boo === 'Boo') {
			throw new TypeError();
		}`,
		`if (typeof boo === 'Boo') {
			some.thing.else.happens.before();
			throw new Error();
		}`,
		`if (Number.isNaN(foo)) {
			throw new TypeError();
		}`,
		`if (Number.isFinite(foo) && Number.isSafeInteger(foo) && Number.isInteger(foo)) {
			throw new TypeError();
		}`,
		`if (Array.isArray(foo) || (Blob.isBlob(foo) || Blip.isBlip(foo))) {
			throw new TypeError();
		}`,
		`if (typeof foo === 'object' || (Object.isFrozen(foo) || 'String' === typeof foo)) {
			throw new TypeError();
		}`,
		`if (isNaN) {
			throw new Error();
		}`,
		`if (isObjectLike) {
			throw new Error();
		}`,
		`if (isNaN.foo()) {
			throw new Error();
		}`,
		`if (typeof foo !== 'object' || foo.bar() === false) {
			throw new TypeError('Expected Foo being bar!');
		}`,
		`if (foo instanceof Foo) {
			throw new TypeError('Expected Foo being bar!');
		}`,
		`if (!foo instanceof Foo) {
			throw new TypeError('Expected Foo being bar!');
		}`,
		`if (foo instanceof Foo === false) {
			throw new TypeError('Expected Foo being bar!');
		}`,
		`throw new Error('💣')`,
		`if (!Number.isNaN(foo) && foo === 10) {
			throw new Error('foo is not 10!');
		}`,
		`function foo(foo) {
			if (!Number.isNaN(foo) && foo === 10) {
				timesFooWas10 += 1;
				if (calculateAnswerToLife() !== 42) {
					openIssue('Your program is buggy!');
				} else {
					return printAwesomeAnswer(42);
				}
				throw new Error('foo is 10');
			}
		}`,
		`function foo(foo) {
			if (!Number.isNaN(foo)) {
				timesFooWas10 += 1;
				if (calculateAnswerToLife({with: foo}) !== 42) {
					openIssue('Your program is buggy!');
				} else {
					return printAwesomeAnswer(42);
				}
				throw new Error('foo is 10');
			}
		}`,
		`if (!x.isFudge()) {
			throw new Error('x is no fudge!');
		}`,
		`if (!_.isFudge(x)) {
			throw new Error('x is no fudge!');
		}`
	],
	invalid: [
		{
			code: `if (!isFinite(foo)) {
				throw new Error();
			}`,
			output: `if (!isFinite(foo)) {
				throw new TypeError();
			}`,
			errors
		},
		{
			code: `if (isNaN(foo) === false) {
				throw new Error();
			}`,
			output: `if (isNaN(foo) === false) {
				throw new TypeError();
			}`,
			errors
		},
		{
			code: `if (Array.isArray(foo)) {
				throw new Error('foo is an Array');
			}`,
			output: `if (Array.isArray(foo)) {
				throw new TypeError('foo is an Array');
			}`,
			errors
		},
		{
			code: `if (foo instanceof bar) {
				throw new Error(foobar);
			}`,
			output: `if (foo instanceof bar) {
				throw new TypeError(foobar);
			}`,
			errors
		},
		{
			code: `if (_.isElement(foo)) {
				throw new Error();
			}`,
			output: `if (_.isElement(foo)) {
				throw new TypeError();
			}`,
			errors
		},
		{
			code: `if (_.isElement(foo)) {
				throw new Error;
			}`,
			output: `if (_.isElement(foo)) {
				throw new TypeError;
			}`,
			errors
		},
		{
			code: `if (wrapper._.isElement(foo)) {
				throw new Error;
			}`,
			output: `if (wrapper._.isElement(foo)) {
				throw new TypeError;
			}`,
			errors
		},
		{
			code: `if (typeof foo == 'Foo' || 'Foo' === typeof foo) {
				throw new Error();
			}`,
			output: `if (typeof foo == 'Foo' || 'Foo' === typeof foo) {
				throw new TypeError();
			}`,
			errors
		},
		{
			code: `if (Number.isFinite(foo) && Number.isSafeInteger(foo) && Number.isInteger(foo)) {
				throw new Error();
			}`,
			output: `if (Number.isFinite(foo) && Number.isSafeInteger(foo) && Number.isInteger(foo)) {
				throw new TypeError();
			}`,
			errors
		},
		{
			code: `if (wrapper.n.isFinite(foo) && wrapper.n.isSafeInteger(foo) && wrapper.n.isInteger(foo)) {
				throw new Error();
			}`,
			output: `if (wrapper.n.isFinite(foo) && wrapper.n.isSafeInteger(foo) && wrapper.n.isInteger(foo)) {
				throw new TypeError();
			}`,
			errors
		},
		{
			code: `if (wrapper.f.g.n.isFinite(foo) && wrapper.g.n.isSafeInteger(foo) && wrapper.n.isInteger(foo)) {
				throw new Error();
			}`,
			output: `if (wrapper.f.g.n.isFinite(foo) && wrapper.g.n.isSafeInteger(foo) && wrapper.n.isInteger(foo)) {
				throw new TypeError();
			}`,
			errors
		}
	].concat(
		Array.from(tcIdentifiers).map(identifier => tcIdentifierInvalidTest(identifier))
	)
});
