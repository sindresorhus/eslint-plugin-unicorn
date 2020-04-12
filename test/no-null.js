import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/no-null';

const ERROR_MESSAGE_ID = 'error';
const SUGGESTION_REPLACE_MESSAGE_ID = 'replace';
const SUGGESTION_REMOVE_MESSAGE_ID = 'remove';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module'
	}
});

const invalidTestCase = testCase => {
	const {
		code,
		output,
		suggestions,
		checkStrictEquality
	} = typeof testCase === 'string' ? {code: testCase} : testCase;

	const options = typeof checkStrictEquality === 'boolean' ? [{checkStrictEquality}] : [];

	if (suggestions) {
		return {
			code,
			output: code,
			options,
			errors: [
				{
					messageId: ERROR_MESSAGE_ID,
					suggestions
				}
			]
		};
	}

	if (output) {
		return {
			code,
			output,
			options,
			errors: [
				{
					messageId: ERROR_MESSAGE_ID,
					suggestions: undefined
				}
			]
		};
	}

	return {
		code,
		output: code,
		options,
		errors: [
			{
				messageId: ERROR_MESSAGE_ID
			}
		]
	};
};

ruleTester.run('no-null', rule, {
	valid: [
		'let foo',
		'Object.create(null)',
		// Not `null`
		'const foo = "null";',
		// More/Less arguments
		'Object.create()',
		// Not `null`
		'Object.create(bar)',
		'Object.create("null")',

		// Ignored
		'if (foo === null) {}',
		'if (null === foo) {}',
		'if (foo !== null) {}',
		'if (null !== foo) {}',
		// `checkStrictEquality: false`
		...[
			'if (foo === null) {}',
			'if (null === foo) {}',
			'if (foo !== null) {}',
			'if (null !== foo) {}'
		].map(code => ({
			code,
			options: [{checkStrictEquality: false}]
		}))
	],
	invalid: [
		invalidTestCase('const foo = null'),
		invalidTestCase('foo(null)'),

		// Auto fix
		invalidTestCase({
			code: 'if (foo == null) {}',
			output: 'if (foo == undefined) {}'
		}),
		invalidTestCase({
			code: 'if (foo != null) {}',
			output: 'if (foo != undefined) {}'
		}),
		invalidTestCase({
			code: 'if (null == foo) {}',
			output: 'if (undefined == foo) {}'
		}),
		invalidTestCase({
			code: 'if (null != foo) {}',
			output: 'if (undefined != foo) {}'
		}),

		// Suggestion `ReturnStatement`
		invalidTestCase({
			code: outdent`
				function foo() {
					return null;
				}
			`,
			suggestions: [
				{
					messageId: SUGGESTION_REMOVE_MESSAGE_ID,
					output: outdent`
						function foo() {
							return ;
						}
					`
				},
				{
					messageId: SUGGESTION_REPLACE_MESSAGE_ID,
					output: outdent`
						function foo() {
							return undefined;
						}
					`
				}
			]
		}),

		// Suggestion `VariableDeclaration`
		invalidTestCase({
			code: 'let foo = null;',
			suggestions: [
				{
					messageId: SUGGESTION_REMOVE_MESSAGE_ID,
					output: 'let foo;'
				},
				{
					messageId: SUGGESTION_REPLACE_MESSAGE_ID,
					output: 'let foo = undefined;'
				}
			]
		}),
		invalidTestCase({
			code: 'var foo = null;',
			suggestions: [
				{
					messageId: SUGGESTION_REMOVE_MESSAGE_ID,
					output: 'var foo;'
				},
				{
					messageId: SUGGESTION_REPLACE_MESSAGE_ID,
					output: 'var foo = undefined;'
				}
			]
		}),
		invalidTestCase({
			code: 'var foo = 1, bar = null, baz = 2;',
			suggestions: [
				{
					messageId: SUGGESTION_REMOVE_MESSAGE_ID,
					output: 'var foo = 1, bar, baz = 2;'
				},
				{
					messageId: SUGGESTION_REPLACE_MESSAGE_ID,
					output: 'var foo = 1, bar = undefined, baz = 2;'
				}
			]
		}),
		invalidTestCase({
			code: 'const foo = null;',
			suggestions: [
				{
					messageId: SUGGESTION_REPLACE_MESSAGE_ID,
					output: 'const foo = undefined;'
				}
			]
		}),

		// `checkStrictEquality`
		...[
			'if (foo === null) {}',
			'if (null === foo) {}',
			'if (foo !== null) {}',
			'if (null !== foo) {}'
		].map(code => invalidTestCase({
			code,
			checkStrictEquality: true
		})),

		// Not `CallExpression`
		invalidTestCase('new Object.create(null)'),
		// Not `MemberExpression`
		invalidTestCase('create(null)'),
		// `callee.property` is not a `Identifier`
		invalidTestCase('Object["create"](null)'),
		// Computed
		invalidTestCase('Object[create](null)'),
		{
			code: 'Object[null](null)',
			errors: [{}, {}]
		},
		// Not `create`
		invalidTestCase('Object.notCreate(null)'),
		// Not `Object`
		invalidTestCase('NotObject.create(null)'),
		// `callee.object.type` is not a `Identifier`
		invalidTestCase('lib.Object.create(null)'),
		// More/Less arguments
		invalidTestCase('Object.create(null, "")'),
		invalidTestCase('Object.create(...[null])')
	]
});
