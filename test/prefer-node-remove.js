import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-node-remove';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		ecmaVersion: 2020
	}
});

const message = 'Prefer Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`.';

const invalidTestCase = (code, output) => {
	return {
		code,
		output,
		errors: [
			{
				message
			}
		]
	};
};

const noFixTestCase = code => ({
	code,
	output: code,
	errors: [
		{
			message
		}
	]
});

ruleTester.run('prefer-node-remove', rule, {
	valid: [
		'foo.remove()',
		'this.remove()',
		'remove()',
		'foo.parentNode.removeChild(\'bar\')',
		'parentNode.removeChild(undefined)',

		// Not `CallExpression`
		'new parentNode.removeChild(bar);',
		// Not `MemberExpression`
		'removeChild(foo);',
		// `callee.property` is not a `Identifier`
		'parentNode[\'removeChild\'](bar);',
		// Computed
		'parentNode[removeChild](bar);',
		// Not `removeChild`
		'parentNode.foo(bar);',
		// More or less argument(s)
		'parentNode.removeChild(bar, extra);',
		'parentNode.removeChild();',
		'parentNode.removeChild(...argumentsArray)',

		// TODO: support cases bellow, maybe more
		'parentNode.removeChild(some.node)',
		'parentNode.removeChild(get.child())',
		'const foo = async () => parentNode.removeChild(await getChild())',
		'parentNode.removeChild((() => childNode)())'
	],
	invalid: [
		invalidTestCase(
			'parentNode.removeChild(foo)',
			'foo.remove()'
		),
		invalidTestCase(
			'parentNode.removeChild(this)',
			'this.remove()'
		),
		// Value of `parentNode.removeChild` call is used
		noFixTestCase('if (parentNode.removeChild(foo)) {}'),
		noFixTestCase('var removed = parentNode.removeChild(child);'),
		noFixTestCase('const foo = parentNode.removeChild(child);'),
		noFixTestCase('console.log(parentNode.removeChild(child));'),
		noFixTestCase('parentNode.removeChild(child) || "foo";'),
		noFixTestCase('parentNode.removeChild(child) + 0;'),
		noFixTestCase('+parentNode.removeChild(child);'),
		noFixTestCase('parentNode.removeChild(child) ? "foo" : "bar";'),
		noFixTestCase('if (parentNode.removeChild(child)) {}'),
		noFixTestCase('const foo = [parentNode.removeChild(child)]'),
		noFixTestCase('const foo = { bar: parentNode.removeChild(child) }'),
		noFixTestCase('function foo() { return parentNode.removeChild(child); }'),
		noFixTestCase('const foo = () => { return parentElement.removeChild(child); }'),
		noFixTestCase('foo(bar = parentNode.removeChild(child))')
	]
});
