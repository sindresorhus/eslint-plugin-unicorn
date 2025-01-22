import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
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
		'const foo = null',
		'foo(null)',

		// Auto fix
		'if (foo == null) {}',
		'if (foo != null) {}',
		'if (null == foo) {}',
		'if (null != foo) {}',

		// Suggestion `ReturnStatement`
		outdent`
			function foo() {
				return null;
			}
		`,

		// Suggestion `VariableDeclaration`
		'let foo = null;',
		'var foo = null;',
		'var foo = 1, bar = null, baz = 2;',
		'const foo = null;',

		// `checkStrictEquality`
		...[
			'if (foo === null) {}',
			'if (null === foo) {}',
			'if (foo !== null) {}',
			'if (null !== foo) {}',
		].map(code => ({
			code,
			options: [{checkStrictEquality: true}],
		})),

		// Not `CallExpression`
		'new Object.create(null)',
		'new foo.insertBefore(bar, null)',
		// Not `MemberExpression`
		'create(null)',
		'insertBefore(bar, null)',
		// `callee.property` is not a `Identifier`
		'Object["create"](null)',
		'foo["insertBefore"](bar, null)',
		// Computed
		'Object[create](null)',
		'foo[insertBefore](bar, null)',
		'Object[null](null)',
		// Not matching method
		'Object.notCreate(null)',
		'foo.notInsertBefore(foo, null)',
		// Not `Object`
		'NotObject.create(null)',
		// `callee.object.type` is not a `Identifier`
		'lib.Object.create(null)',
		// More/Less arguments
		'Object.create(...[null])',
		'Object.create(null, bar, extraArgument)',
		'foo.insertBefore(null)',
		'foo.insertBefore(foo, null, bar)',
		'foo.insertBefore(...[foo], null)',
		// Not in right position
		'foo.insertBefore(null, bar)',
		'Object.create(bar, null)',
	],
});

// #1146
test({
	testerOptions: {
		languageOptions: {
			parserOptions: {
				ecmaVersion: 2019,
			},
		},
	},
	valid: [
		'foo = Object.create(null)',
	],
	invalid: [],
});
