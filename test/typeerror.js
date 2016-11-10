import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/type-error';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const typeError = {
	ruleId: 'type-error',
	message: '`new Error()` is too unspecific for a typecheck, use `new TypeError()` instead.'
};

ruleTester.run('type-error', rule, {
	valid: [
		`if (Array.isValid(foo)) {
			throw new TypeError();
		}`,
		`if (foo instanceof boo) {
			throw new TypeError();
		}`,
		`if (typeof boo === 'Boo') {
			throw new TypeError();
		}`,
		`if (Blob.isBlob(foo)) {
			throw new TypeError();
		}`,
		`if (Array.isArray(foo) || (Blob.isBlob(foo) || Blip.isBlip(foo))) {
			throw new TypeError();
		}`,
		`if (typeof foo === 'object' || (Blob.isBlob(foo) || 'String' === typeof foo)) {
			throw new TypeError();
		}`,
		`if (Blob.isBlob(foo) && Array.isArray(foo)) {
			throw new TypeError();
		}`
	],
	invalid: [
		{
			code: `if (Array.isArray(foo)) {
				throw new Error();
			}`,
			errors: [typeError]
		},
		{
			code: `if (foo instanceof bar) {
				throw new Error();
			}`,
			errors: [typeError]
		},
		{
			code:	`if (kindOf(foo) === 'Foo') {
				throw new Error();
			}`,
			errors: [typeError]
		},
		{
			code: `if (check.not.emptySomething(foo)) {
				throw new Error();
			}`,
			errors: [typeError]
		},
		{
			code: `if (typeof foo == 'Foo' || 'Foo' === typeof foo) {
				throw new Error();
			}`,
			errors: [typeError]
		},
		{
			code: `if (Array.isArray(foo) || (Blob.isBlob(foo) || isBlip(foo))) {
				throw new Error();
			}`,
			errors: [typeError]
		}
	]
});
