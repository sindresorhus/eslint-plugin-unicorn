import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-node-remove';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const invalidTestCase = (code, output, parentName, argumentName) => {
	return {
		code,
		output,
		errors: [
			{
				message: `Prefer \`${argumentName}.remove()\` over \`${parentName}.removeChild(${argumentName})\`.`
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
		'new foo.parentNode.removeChild(foo);',
		// Not `MemberExpression`
		'removeChild(foo);',
		// `callee.property` is not a `Identifier`
		'foo.parentNode[\'removeChild\'](foo);',
		// Computed
		'foo.parentNode[removeChild](foo);',
		// Not `removeChild`
		'foo.parentNode.foo(foo);',
		// More or less argument(s)
		'foo.parentNode.removeChild(foo, two);',
		'foo.parentNode.removeChild();',
		'foo.parentNode.removeChild(...argumentsArray)'
	],
	invalid: [
		invalidTestCase(
			'foo.parentNode.removeChild(foo)',
			'foo.remove()',
			'parentNode',
			'foo'
		),
		invalidTestCase(
			'this.parentNode.removeChild(this)',
			'this.remove()',
			'parentNode',
			'this'
		),
		invalidTestCase(
			'parentNode.removeChild(this)',
			'this.remove()',
			'parentNode',
			'this'
		),
		invalidTestCase(
			'foo.parentNode.removeChild(bar)',
			'bar.remove()',
			'parentNode',
			'bar'
		),
		invalidTestCase(
			'this.parentNode.removeChild(foo)',
			'foo.remove()',
			'parentNode',
			'foo'
		),
		invalidTestCase(
			'foo.parentElement.removeChild(foo)',
			'foo.remove()',
			'parentElement',
			'foo'
		),
		invalidTestCase(
			'this.parentElement.removeChild(this)',
			'this.remove()',
			'parentElement',
			'this'
		),
		invalidTestCase(
			'parentElement.removeChild(this)',
			'this.remove()',
			'parentElement',
			'this'
		),
		invalidTestCase(
			'foo.parentElement.removeChild(bar)',
			'bar.remove()',
			'parentElement',
			'bar'
		),
		invalidTestCase(
			'this.parentElement.removeChild(foo)',
			'foo.remove()',
			'parentElement',
			'foo'
		),
		invalidTestCase(
			'if (foo.parentNode.removeChild(foo)) {}',
			'if (foo.parentNode.removeChild(foo)) {}',
			'parentNode',
			'foo'
		),
		invalidTestCase(
			'var removed = foo.parentNode.removeChild(foo);',
			'var removed = foo.parentNode.removeChild(foo);',
			'parentNode',
			'foo'
		),
		invalidTestCase(
			'const foo = node.parentNode.removeChild(child);',
			'const foo = node.parentNode.removeChild(child);',
			'parentNode',
			'child'
		),
		invalidTestCase(
			'console.log(node.parentNode.removeChild(child));',
			'console.log(node.parentNode.removeChild(child));',
			'parentNode',
			'child'
		),
		invalidTestCase(
			'node.parentNode.removeChild(child) || "foo";',
			'node.parentNode.removeChild(child) || "foo";',
			'parentNode',
			'child'
		),
		invalidTestCase(
			'node.parentNode.removeChild(child) + 0;',
			'node.parentNode.removeChild(child) + 0;',
			'parentNode',
			'child'
		),
		invalidTestCase(
			'node.parentNode.removeChild(child) + 0;',
			'node.parentNode.removeChild(child) + 0;',
			'parentNode',
			'child'
		),
		invalidTestCase(
			'+node.parentNode.removeChild(child);',
			'+node.parentNode.removeChild(child);',
			'parentNode',
			'child'
		),
		invalidTestCase(
			'node.parentNode.removeChild(child) ? "foo" : "bar";',
			'node.parentNode.removeChild(child) ? "foo" : "bar";',
			'parentNode',
			'child'
		),
		invalidTestCase(
			'if (node.parentNode.removeChild(child)) {}',
			'if (node.parentNode.removeChild(child)) {}',
			'parentNode',
			'child'
		),
		invalidTestCase(
			'const foo = [node.parentNode.removeChild(child)]',
			'const foo = [node.parentNode.removeChild(child)]',
			'parentNode',
			'child'
		),
		invalidTestCase(
			'const foo = { bar: node.parentNode.removeChild(child) }',
			'const foo = { bar: node.parentNode.removeChild(child) }',
			'parentNode',
			'child'
		),
		invalidTestCase(
			'function foo() { return node.parentNode.removeChild(child); }',
			'function foo() { return node.parentNode.removeChild(child); }',
			'parentNode',
			'child'
		),
		invalidTestCase(
			'const foo = () => { return node.parentNode.removeChild(child); }',
			'const foo = () => { return node.parentNode.removeChild(child); }',
			'parentNode',
			'child'
		),
		invalidTestCase(
			'foo(bar = node.parentNode.removeChild(child))',
			'foo(bar = node.parentNode.removeChild(child))',
			'parentNode',
			'child'
		)
	]
});
