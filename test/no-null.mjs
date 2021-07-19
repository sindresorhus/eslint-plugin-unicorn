import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const ERROR_MESSAGE_ID = 'error';
const SUGGESTION_REPLACE_MESSAGE_ID = 'replace';
const SUGGESTION_REMOVE_MESSAGE_ID = 'remove';

const invalidTestCase = testCase => {
	const {
		code,
		output,
		suggestions,
		checkStrictEquality,
	} = typeof testCase === 'string' ? {code: testCase} : testCase;

	const options = typeof checkStrictEquality === 'boolean' ? [{checkStrictEquality}] : [];

	if (suggestions) {
		return {
			code,
			options,
			errors: [
				{
					messageId: ERROR_MESSAGE_ID,
					suggestions,
				},
			],
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
					suggestions: undefined,
				},
			],
		};
	}

	return {
		code,
		options,
		errors: [
			{
				messageId: ERROR_MESSAGE_ID,
			},
		],
	};
};

test({
	valid: [
		'let foo',
		'Object.create(null)',
		'Object.create(null, {foo: {value:1}})',
		'let insertedNode = parentNode.insertBefore(newNode, null)',
		// Not `null`
		'const foo = "null";',
		// More/Less arguments
		'Object.create()',
		// Not `null`
		'Object.create(bar)',
		'Object.create("null")',

		// `React.useRef(null)`
		'useRef(null)',
		'React.useRef(null)',

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
			'if (null !== foo) {}',
		].map(code => ({
			code,
			options: [{checkStrictEquality: false}],
		})),
	],
	invalid: [
		invalidTestCase('const foo = null'),
		invalidTestCase('foo(null)'),

		// Auto fix
		invalidTestCase({
			code: 'if (foo == null) {}',
			output: 'if (foo == undefined) {}',
		}),
		invalidTestCase({
			code: 'if (foo != null) {}',
			output: 'if (foo != undefined) {}',
		}),
		invalidTestCase({
			code: 'if (null == foo) {}',
			output: 'if (undefined == foo) {}',
		}),
		invalidTestCase({
			code: 'if (null != foo) {}',
			output: 'if (undefined != foo) {}',
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
					`,
				},
				{
					messageId: SUGGESTION_REPLACE_MESSAGE_ID,
					output: outdent`
						function foo() {
							return undefined;
						}
					`,
				},
			],
		}),

		// Suggestion `VariableDeclaration`
		invalidTestCase({
			code: 'let foo = null;',
			suggestions: [
				{
					messageId: SUGGESTION_REMOVE_MESSAGE_ID,
					output: 'let foo;',
				},
				{
					messageId: SUGGESTION_REPLACE_MESSAGE_ID,
					output: 'let foo = undefined;',
				},
			],
		}),
		invalidTestCase({
			code: 'var foo = null;',
			suggestions: [
				{
					messageId: SUGGESTION_REMOVE_MESSAGE_ID,
					output: 'var foo;',
				},
				{
					messageId: SUGGESTION_REPLACE_MESSAGE_ID,
					output: 'var foo = undefined;',
				},
			],
		}),
		invalidTestCase({
			code: 'var foo = 1, bar = null, baz = 2;',
			suggestions: [
				{
					messageId: SUGGESTION_REMOVE_MESSAGE_ID,
					output: 'var foo = 1, bar, baz = 2;',
				},
				{
					messageId: SUGGESTION_REPLACE_MESSAGE_ID,
					output: 'var foo = 1, bar = undefined, baz = 2;',
				},
			],
		}),
		invalidTestCase({
			code: 'const foo = null;',
			suggestions: [
				{
					messageId: SUGGESTION_REPLACE_MESSAGE_ID,
					output: 'const foo = undefined;',
				},
			],
		}),

		// `checkStrictEquality`
		...[
			'if (foo === null) {}',
			'if (null === foo) {}',
			'if (foo !== null) {}',
			'if (null !== foo) {}',
		].map(code => invalidTestCase({
			code,
			checkStrictEquality: true,
		})),

		// Not `CallExpression`
		invalidTestCase('new Object.create(null)'),
		invalidTestCase('new foo.insertBefore(bar, null)'),
		// Not `MemberExpression`
		invalidTestCase('create(null)'),
		invalidTestCase('insertBefore(bar, null)'),
		// `callee.property` is not a `Identifier`
		invalidTestCase('Object["create"](null)'),
		invalidTestCase('foo["insertBefore"](bar, null)'),
		// Computed
		invalidTestCase('Object[create](null)'),
		invalidTestCase('foo[insertBefore](bar, null)'),
		{
			code: 'Object[null](null)',
			errors: [{}, {}],
		},
		// Not matching method
		invalidTestCase('Object.notCreate(null)'),
		invalidTestCase('foo.notInsertBefore(foo, null)'),
		// Not `Object`
		invalidTestCase('NotObject.create(null)'),
		// `callee.object.type` is not a `Identifier`
		invalidTestCase('lib.Object.create(null)'),
		// More/Less arguments
		invalidTestCase('Object.create(...[null])'),
		invalidTestCase('foo.insertBefore(null)'),
		invalidTestCase('foo.insertBefore(foo, null, bar)'),
		invalidTestCase('foo.insertBefore(...[foo], null)'),
		// Not in right position
		invalidTestCase('foo.insertBefore(null, bar)'),
	],
});

// #1146
test({
	testerOptions: {
		parserOptions: {
			ecmaVersion: 2019,
		},
	},
	valid: [
		'foo = Object.create(null)',
	],
	invalid: [],
});
