import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-null';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		sourceType: 'module'
	}
});

const noNullError = {
	ruleId: 'no-null',
	message: 'Use undefined instead of null'
};

ruleTester.run('no-null', rule, {
	valid: [
		'let foo',
		'Object.create(null)',
		// Not `null`
		'const foo = "null";',
		// More/Less arguments
		'Object.create()'
	],
	invalid: [
		{
			code: 'const foo = null',
			errors: [
				noNullError
			]
		},
		{
			code: 'if (bar === null) {}',
			errors: [
				noNullError
			]
		},
		// Not `CallExpression`
		{
			code: 'new Object.create(null)',
			errors: [
				noNullError
			]
		},
		// Not `MemberExpression`
		{
			code: 'create(null)',
			errors: [
				noNullError
			]
		},
		// `callee.property` is not a `Identifier`
		{
			code: 'Object["create"](null)',
			errors: [
				noNullError
			]
		},
		// Computed
		{
			code: 'Object[create](null)',
			errors: [
				noNullError
			]
		},
		// Not `create`
		{
			code: 'Object.notCreate(null)',
			errors: [
				noNullError
			]
		},
		// Not `Object`
		{
			code: 'NotObject.create(null)',
			errors: [
				noNullError
			]
		},
		// `callee.object.type` is not a `Identifier`
		{
			code: 'lib.Object.create(null)',
			errors: [
				noNullError
			]
		},
		// More/Less arguments
		{
			code: 'Object.create(null, "")',
			errors: [
				noNullError
			]
		},
		{
			code: 'Object.create(...[null])',
			errors: [
				noNullError
			]
		}
	]
});
