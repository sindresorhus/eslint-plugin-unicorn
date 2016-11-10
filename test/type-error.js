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
	message: '`new Error()` is too unspecific for a typecheck, use `new TypeError()` instead.'
}];

ruleTester.run('type-error', rule, {
	valid: [
		`if (Array.isArray(foo) || ArrayBuffer.isView(foo)) {
			throw new TypeError();
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
		`if (Object.isSealed(foo) && _.isArguments(foo)) {
			throw new TypeError();
		}`
	],
	invalid: [
		{
			code: `if (Array.isArray(foo)) {
				throw new Error();
			}`,
			output: `if (Array.isArray(foo)) {
				throw new TypeError();
			}`,
			errors
		},
		{
			code: `if (foo instanceof bar) {
				throw new Error();
			}`,
			output: `if (foo instanceof bar) {
				throw new TypeError();
			}`,
			errors
		},
		{
			code:	`if (Object.isSealed(foo)) {
				throw new Error();
			}`,
			output: `if (Object.isSealed(foo)) {
				throw new TypeError();
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
		}
	]
});
