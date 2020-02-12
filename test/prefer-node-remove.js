import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-node-remove';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const message = `Prefer Prefer \`childNode.remove()\` over \`parentNode.removeChild(childNode)\`.`

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

ruleTester.run('prefer-node-remove', rule, {
	valid: [
		'foo.remove()',
		'this.remove()',
		'remove()',
		'foo.parentNode.removeChild(\'bar\')',
		// Not `CallExpression`
		'new foo.removeChild(bar);',
		// Not `MemberExpression`
		'removeChild(foo);',
		// `callee.property` is not a `Identifier`
		'foo[\'removeChild\'](bar);',
		// Computed
		'foo[removeChild](bar);',
		// Not `removeChild`
		'foo.foo(bar);',
		// More or less argument(s)
		'foo.removeChild(bar, extra);',
		'foo.removeChild();',
		'foo.removeChild(...argumentsArray)'
	],
	invalid: [
		invalidTestCase(
			'bar.removeChild(foo)',
			'foo.remove()'
		),
		invalidTestCase(
			'bar.removeChild(this)',
			'this.remove()'
		),
		invalidTestCase(
			'parentNode.removeChild(this)',
			'this.remove()'
		),
		invalidTestCase(
			'foo.parentNode.removeChild(bar)',
			'bar.remove()'
		),
		invalidTestCase(
			'this.parentNode.removeChild(foo)',
			'foo.remove()'
		),
		invalidTestCase(
			'foo.parentElement.removeChild(foo)',
			'foo.remove()'
		),
		invalidTestCase(
			'this.parentElement.removeChild(this)',
			'this.remove()'
		),
		invalidTestCase(
			'parentElement.removeChild(this)',
			'this.remove()'
		),
		invalidTestCase(
			'foo.parentElement.removeChild(bar)',
			'bar.remove()'
		),
		invalidTestCase(
			'this.parentElement.removeChild(foo)',
			'foo.remove()'
		),
		invalidTestCase(
			'if (foo.parentNode.removeChild(foo)) {}',
			'if (foo.parentNode.removeChild(foo)) {}'
		),
		invalidTestCase(
			'var removed = foo.parentNode.removeChild(foo);',
			'var removed = foo.parentNode.removeChild(foo);'
		),
		invalidTestCase(
			'const foo = node.parentNode.removeChild(child);',
			'const foo = node.parentNode.removeChild(child);'
		),
		invalidTestCase(
			'console.log(node.parentNode.removeChild(child));',
			'console.log(node.parentNode.removeChild(child));'
		),
		invalidTestCase(
			'node.parentNode.removeChild(child) || "foo";',
			'node.parentNode.removeChild(child) || "foo";'
		),
		invalidTestCase(
			'node.parentNode.removeChild(child) + 0;',
			'node.parentNode.removeChild(child) + 0;'
		),
		invalidTestCase(
			'node.parentNode.removeChild(child) + 0;',
			'node.parentNode.removeChild(child) + 0;'
		),
		invalidTestCase(
			'+node.parentNode.removeChild(child);',
			'+node.parentNode.removeChild(child);'
		),
		invalidTestCase(
			'node.parentNode.removeChild(child) ? "foo" : "bar";',
			'node.parentNode.removeChild(child) ? "foo" : "bar";'
		),
		invalidTestCase(
			'if (node.parentNode.removeChild(child)) {}',
			'if (node.parentNode.removeChild(child)) {}'
		),
		invalidTestCase(
			'const foo = [node.parentNode.removeChild(child)]',
			'const foo = [node.parentNode.removeChild(child)]'
		),
		invalidTestCase(
			'const foo = { bar: node.parentNode.removeChild(child) }',
			'const foo = { bar: node.parentNode.removeChild(child) }'
		),
		invalidTestCase(
			'function foo() { return node.parentNode.removeChild(child); }',
			'function foo() { return node.parentNode.removeChild(child); }'
		),
		invalidTestCase(
			'const foo = () => { return node.parentNode.removeChild(child); }',
			'const foo = () => { return node.parentNode.removeChild(child); }'
		),
		invalidTestCase(
			'foo(bar = node.parentNode.removeChild(child))',
			'foo(bar = node.parentNode.removeChild(child))'
		),
		invalidTestCase(
			'parentNode.removeChild(foo)',
			'foo.remove()'
		)
	]
});
