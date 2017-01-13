import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/type-error';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [{
	ruleId: 'type-error',
	message: '`new Error()` is too unspecific for a type check, use `new TypeError()` instead.'
}];

ruleTester.run('type-error', rule, {
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
		`if (foo instanceof boo) {
			throw new TypeError();
		}`,
		`if (typeof boo === 'Boo') {
			throw new TypeError();
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
		},
		/*
			Exhaustive check for members of tcIdentifiers

			The structure of the following tests only differs by the identifier, to allow mass
			changes with regular expressions.
		*/
		{
			code: `if(SomeThing.isArguments(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isArguments(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isArray(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isArray(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isArrayBuffer(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isArrayBuffer(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isArrayLike(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isArrayLike(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isArrayLikeObject(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isArrayLikeObject(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isBoolean(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isBoolean(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isBuffer(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isBuffer(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isDate(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isDate(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isElement(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isElement(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isEmptyObject(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isEmptyObject(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isError(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isError(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isFinite(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isFinite(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isFunction(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isFunction(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isInteger(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isInteger(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isLength(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isLength(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isMap(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isMap(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isNaN(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isNaN(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isNative(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isNative(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isNil(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isNil(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isNull(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isNull(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isNumber(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isNumber(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isObject(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isObject(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isObjectLike(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isObjectLike(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isPlainObject(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isPlainObject(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isPrototypeOf(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isPrototypeOf(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isRegExp(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isRegExp(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isSafeInteger(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isSafeInteger(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isSet(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isSet(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isString(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isString(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isSymbol(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isSymbol(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isTypedArray(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isTypedArray(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isUndefined(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isUndefined(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isView(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isView(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isWeakMap(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isWeakMap(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isWeakSet(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isWeakSet(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isWindow(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isWindow(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		},
		{
			code: `if(SomeThing.isXMLDoc(foo) === bar) {
				throw new Error('foo is bar');
			}`,
			output: `if(SomeThing.isXMLDoc(foo) === bar) {
				throw new TypeError('foo is bar');
			}`,
			errors
		}
	]
});
