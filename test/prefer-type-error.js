import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const MESSAGE_ID = 'prefer-type-error';
const errors = [
	{
		messageId: MESSAGE_ID,
	},
];

const tcIdentifiers = new Set([
	'isArguments',
	'isArray',
	'isArrayBuffer',
	'isArrayLike',
	'isArrayLikeObject',
	'isBigInt',
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
	'isXMLDoc',
]);

const tcIdentifierInvalidTest = identifier => ({
	code: outdent`
		if (SomeThing.${identifier}(foo) === bar) {
			throw new Error('foo is bar');
		}
	`,
	output: outdent`
		if (SomeThing.${identifier}(foo) === bar) {
			throw new TypeError('foo is bar');
		}
	`,
	errors,
});

test({
	valid: [
		outdent`
			if (MrFuManchu.name !== 'Fu Manchu' || MrFuManchu.isMale === false) {
				throw new Error('How cant Fu Manchu be Fu Manchu?');
			}
		`,
		outdent`
			if (Array.isArray(foo) || ArrayBuffer.isView(foo)) {
				throw new TypeError();
			}
		`,
		outdent`
			if (wrapper.g.ary.isArray(foo) || wrapper.f.g.ary.isView(foo)) {
				throw new TypeError();
			}
		`,
		outdent`
			if (wrapper.g.ary(foo) || wrapper.f.g.ary.isPiew(foo)) {
				throw new Error();
			}
		`,
		outdent`
			if (Array.isArray()) {
				throw new Error('Woohoo - isArray is broken!');
			}
		`,
		outdent`
			if (Array.isArray(foo) || ArrayBuffer.isView(foo)) {
				throw new CustomError();
			}
		`,
		outdent`
			if (Array.isArray(foo)) {
				throw new Error.foo();
			}
		`,
		outdent`
			if (Array.isArray(foo)) {
				throw new Error.foo;
			}
		`,
		outdent`
			if (Array.isArray(foo)) {
				throw new foo.Error;
			}
		`,
		outdent`
			if (Array.isArray(foo)) {
				throw new foo.Error('My name is Foo Manchu');
			}
		`,
		outdent`
			if (Array.isArray(foo) || ArrayBuffer.isView(foo)) {
				throw Error('This is fo FooBar', foo);
			}
		`,
		outdent`
			if (Array.isArray(foo) || ArrayBuffer.isView(foo)) {
				new Error('This is fo FooBar', foo);
			}
		`,
		outdent`
			function test(foo) {
				if (Array.isArray(foo) || ArrayBuffer.isView(foo)) {
					return new Error('This is fo FooBar', foo);
				}
				return foo;
			}
		`,
		outdent`
			if (Array.isArray(foo) || ArrayBuffer.isView(foo)) {
				lastError = new Error('This is fo FooBar', foo);
			}
		`,
		outdent`
			if (!isFinite(foo)) {
				throw new TypeError();
			}
		`,
		outdent`
			if (isNaN(foo)) {
				throw new TypeError();
			}
		`,
		outdent`
			if (isArray(foo)) {
				throw new Error();
			}
		`,
		outdent`
			if (foo instanceof boo) {
				throw new TypeError();
			}
		`,
		outdent`
			if (typeof boo === 'Boo') {
				throw new TypeError();
			}
		`,
		outdent`
			if (typeof boo === 'Boo') {
				some.thing.else.happens.before();
				throw new Error();
			}
		`,
		outdent`
			if (Number.isNaN(foo)) {
				throw new TypeError();
			}
		`,
		outdent`
			if (Number.isFinite(foo) && Number.isSafeInteger(foo) && Number.isInteger(foo)) {
				throw new TypeError();
			}
		`,
		outdent`
			if (Array.isArray(foo) || (Blob.isBlob(foo) || Blip.isBlip(foo))) {
				throw new TypeError();
			}
		`,
		outdent`
			if (typeof foo === 'object' || (Object.isFrozen(foo) || 'String' === typeof foo)) {
				throw new TypeError();
			}
		`,
		outdent`
			if (isNaN) {
				throw new Error();
			}
		`,
		outdent`
			if (isObjectLike) {
				throw new Error();
			}
		`,
		outdent`
			if (isNaN.foo()) {
				throw new Error();
			}
		`,
		outdent`
			if (typeof foo !== 'object' || foo.bar() === false) {
				throw new TypeError('Expected Foo being bar!');
			}
		`,
		outdent`
			if (foo instanceof Foo) {
				throw new TypeError('Expected Foo being bar!');
			}
		`,
		outdent`
			if (!foo instanceof Foo) {
				throw new TypeError('Expected Foo being bar!');
			}
		`,
		outdent`
			if (foo instanceof Foo === false) {
				throw new TypeError('Expected Foo being bar!');
			}
		`,
		'throw new Error(\'💣\')',
		outdent`
			if (!Number.isNaN(foo) && foo === 10) {
				throw new Error('foo is not 10!');
			}
		`,
		outdent`
			function foo(foo) {
				if (!Number.isNaN(foo) && foo === 10) {
					timesFooWas10 += 1;
					if (calculateAnswerToLife() !== 42) {
						openIssue('Your program is buggy!');
					} else {
						return printAwesomeAnswer(42);
					}
					throw new Error('foo is 10');
				}
			}
		`,
		outdent`
			function foo(foo) {
				if (!Number.isNaN(foo)) {
					timesFooWas10 += 1;
					if (calculateAnswerToLife({with: foo}) !== 42) {
						openIssue('Your program is buggy!');
					} else {
						return printAwesomeAnswer(42);
					}
					throw new Error('foo is 10');
				}
			}
		`,
		outdent`
			if (!x.isFudge()) {
				throw new Error('x is no fudge!');
			}
		`,
		outdent`
			if (!_.isFudge(x)) {
				throw new Error('x is no fudge!');
			}
		`,
		// Should not crash:
		outdent`
			switch (something) {
				case 1:
					break;
				default:
					throw new Error('Unknown');
			}
		`,
		// Ignore error type check
		'if (foo instanceof Error) throw new Error("message")',
		'if (foo instanceof CustomError) throw new Error("message")',
		'if (foo instanceof lib.Error) throw new Error("message")',
		'if (foo instanceof lib.CustomError) throw new Error("message")',
	],
	invalid: [
		{
			code: outdent`
				if (!isFinite(foo)) {
					throw new Error();
				}
			`,
			output: outdent`
				if (!isFinite(foo)) {
					throw new TypeError();
				}
			`,
			errors,
		},
		{
			code: outdent`
				if (isNaN(foo) === false) {
					throw new Error();
				}
			`,
			output: outdent`
				if (isNaN(foo) === false) {
					throw new TypeError();
				}
			`,
			errors,
		},
		{
			code: outdent`
				if (Array.isArray(foo)) {
					throw new Error('foo is an Array');
				}
			`,
			output: outdent`
				if (Array.isArray(foo)) {
					throw new TypeError('foo is an Array');
				}
			`,
			errors,
		},
		{
			code: outdent`
				if (foo instanceof bar) {
					throw new Error(foobar);
				}
			`,
			output: outdent`
				if (foo instanceof bar) {
					throw new TypeError(foobar);
				}
			`,
			errors,
		},
		{
			code: outdent`
				if (_.isElement(foo)) {
					throw new Error();
				}
			`,
			output: outdent`
				if (_.isElement(foo)) {
					throw new TypeError();
				}
			`,
			errors,
		},
		{
			code: outdent`
				if (_.isElement(foo)) {
					throw new Error;
				}
			`,
			output: outdent`
				if (_.isElement(foo)) {
					throw new TypeError;
				}
			`,
			errors,
		},
		{
			code: outdent`
				if (wrapper._.isElement(foo)) {
					throw new Error;
				}
			`,
			output: outdent`
				if (wrapper._.isElement(foo)) {
					throw new TypeError;
				}
			`,
			errors,
		},
		{
			code: outdent`
				if (typeof foo == 'Foo' || 'Foo' === typeof foo) {
					throw new Error();
				}
			`,
			output: outdent`
				if (typeof foo == 'Foo' || 'Foo' === typeof foo) {
					throw new TypeError();
				}
			`,
			errors,
		},
		{
			code: outdent`
				if (Number.isFinite(foo) && Number.isSafeInteger(foo) && Number.isInteger(foo)) {
					throw new Error();
				}
			`,
			output: outdent`
				if (Number.isFinite(foo) && Number.isSafeInteger(foo) && Number.isInteger(foo)) {
					throw new TypeError();
				}
			`,
			errors,
		},
		{
			code: outdent`
				if (wrapper.n.isFinite(foo) && wrapper.n.isSafeInteger(foo) && wrapper.n.isInteger(foo)) {
					throw new Error();
				}
			`,
			output: outdent`
				if (wrapper.n.isFinite(foo) && wrapper.n.isSafeInteger(foo) && wrapper.n.isInteger(foo)) {
					throw new TypeError();
				}
			`,
			errors,
		},
		{
			code: outdent`
				if (wrapper.f.g.n.isFinite(foo) && wrapper.g.n.isSafeInteger(foo) && wrapper.n.isInteger(foo)) {
					throw new Error();
				}
			`,
			output: outdent`
				if (wrapper.f.g.n.isFinite(foo) && wrapper.g.n.isSafeInteger(foo) && wrapper.n.isInteger(foo)) {
					throw new TypeError();
				}
			`,
			errors,
		},
		...[...tcIdentifiers].map(identifier => tcIdentifierInvalidTest(identifier)),
	],
});

test.snapshot({
	valid: [],
	invalid: [
		outdent`
			if (!isFinite(foo)) {
				throw new Error();
			}
		`,
	],
});
