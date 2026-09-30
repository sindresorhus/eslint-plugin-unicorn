import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const optionsIgnoreArguments = [{checkArguments: false}];

test.snapshot({
	valid: [
		'let foo',
		'Object.create(null)',
		'Object.create(null, {foo: {value:1}})',
		'let insertedNode = parentNode.insertBefore(newNode, null)',
		'let insertedNode = parentNode?.insertBefore(newNode, null)',
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
		// `checkArguments: false`
		...[
			'foo(null)',
			'foo(bar, null)',
			'drawingManager.setMap(null)',
			'markers[index].setMap(null)',
			'object?.method?.(null)',
			'foo?.(null)',
			'new HttpResponse(null)',
			'new HttpResponse(body, null)',
		].map(code => ({
			code,
			options: optionsIgnoreArguments,
		})),
		// #1146
		{
			code: 'foo = Object.create(null)',
			languageOptions: {ecmaVersion: 2019},
		},
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
		{
			code: 'const foo = null;',
			options: optionsIgnoreArguments,
		},
		{
			code: outdent`
				function foo() {
					return null;
				}
			`,
			options: optionsIgnoreArguments,
		},
		{
			code: 'if (foo === null) {}',
			options: [{checkArguments: false, checkStrictEquality: true}],
		},
		...[
			'foo([null])',
			'foo(bar ?? null)',
			'foo(...[null])',
			'new HttpResponse([null])',
		].map(code => ({
			code,
			options: optionsIgnoreArguments,
		})),

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

// `using` and `await using` declarations require an initializer, so the "remove" suggestion would produce a syntax error
test.typescript({
	valid: [],
	invalid: [
		{
			code: 'using x = null;',
			errors: [{
				messageId: 'error',
				suggestions: [{messageId: 'replace', output: 'using x = undefined;'}],
			}],
		},
		{
			code: 'async function f() { await using x = null; }',
			errors: [{
				messageId: 'error',
				suggestions: [{messageId: 'replace', output: 'async function f() { await using x = undefined; }'}],
			}],
		},
		{
			code: 'for (using x = null; ; ) { break; }',
			errors: [{
				messageId: 'error',
				suggestions: [{messageId: 'replace', output: 'for (using x = undefined; ; ) { break; }'}],
			}],
		},
		{
			code: 'let x = null;',
			errors: [{
				messageId: 'error',
				suggestions: [
					{messageId: 'remove', output: 'let x;'},
					{messageId: 'replace', output: 'let x = undefined;'},
				],
			}],
		},
	],
});

// The "remove" suggestion deletes the text between the parameter and the `null`, so a comment in that range would be dropped
test({
	valid: [],
	invalid: [
		{
			code: 'let x /* comment */ = null;',
			errors: [{
				messageId: 'error',
				suggestions: [{messageId: 'replace', output: 'let x /* comment */ = undefined;'}],
			}],
		},
		{
			code: 'let x = /* comment */ null;',
			errors: [{
				messageId: 'error',
				suggestions: [{messageId: 'replace', output: 'let x = /* comment */ undefined;'}],
			}],
		},
		{
			code: 'let x /* a */ = /* b */ null /* c */;',
			errors: [{
				messageId: 'error',
				suggestions: [{messageId: 'replace', output: 'let x /* a */ = /* b */ undefined /* c */;'}],
			}],
		},
		{
			code: 'let {a} /* comment */ = null;',
			errors: [{
				messageId: 'error',
				suggestions: [{messageId: 'replace', output: 'let {a} /* comment */ = undefined;'}],
			}],
		},
	],
});

// The parentheses around the value are not part of its range, removing it must take them too
test({
	valid: [],
	invalid: [
		{
			code: 'let foo = (null);',
			errors: [{messageId: 'error', suggestions: [{messageId: 'remove', output: 'let foo;'}, {messageId: 'replace', output: 'let foo = (undefined);'}]}],
		},
		{
			code: 'function f() { return (null); }',
			errors: [{messageId: 'error', suggestions: [{messageId: 'remove', output: 'function f() { return; }'}, {messageId: 'replace', output: 'function f() { return (undefined); }'}]}],
		},
		// The remove suggestion deletes everything between `return` and the `null`, so a comment in that range rules it out
		{
			code: 'function f() { return (/* keep */ null); }',
			errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: 'function f() { return (/* keep */ undefined); }'}]}],
		},
		{
			code: 'let foo = ((null));',
			errors: [{messageId: 'error', suggestions: [{messageId: 'remove', output: 'let foo;'}, {messageId: 'replace', output: 'let foo = ((undefined));'}]}],
		},
		// A comment inside the parentheses is still in the removed range
		{
			code: 'let foo = (/* keep */ null);',
			errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: 'let foo = (/* keep */ undefined);'}]}],
		},
		// A destructuring pattern requires an initializer, so `null` cannot be removed
		{
			code: 'let {a} = null;',
			errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: 'let {a} = undefined;'}]}],
		},
		{
			code: 'let [a] = null;',
			errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: 'let [a] = undefined;'}]}],
		},
	],
});
