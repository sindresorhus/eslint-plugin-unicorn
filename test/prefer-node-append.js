import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/prefer-node-append';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = {
	message: 'Prefer `Node#append()` over `Node#appendChild()`.'
};

ruleTester.run('prefer-node-append', rule, {
	valid: [
		'parent.append(child);',
		'document.body.append(child, \'text\');',
		'node.append()',
		'node.append(null)'
	],
	invalid: [
		{
			code: 'node.appendChild(child);',
			output: 'node.append(child);',
			errors: [error]
		},
		{
			code: 'document.body.appendChild(child);',
			output: 'document.body.append(child);',
			errors: [error]
		},
		{
			code: 'node.appendChild()',
			output: 'node.append()',
			errors: [error]
		},
		{
			code: 'node.appendChild(null)',
			output: 'node.append(null)',
			errors: [error]
		},
		{
			code: outdent`
				function foo() {
					node.appendChild(null);
				}
			`,
			output: outdent`
				function foo() {
					node.append(null);
				}
			`,
			errors: [error]
		},
		{
			code: 'const foo = node.appendChild(child);',
			output: 'const foo = node.appendChild(child);',
			errors: [error]
		},
		{
			code: 'console.log(node.appendChild(child));',
			output: 'console.log(node.appendChild(child));',
			errors: [error]
		},
		{
			code: 'node.appendChild(child).appendChild(grandchild);',
			output: 'node.appendChild(child).append(grandchild);',
			errors: [error, error]
		},
		{
			code: 'node.appendChild(child) || "foo";',
			output: 'node.appendChild(child) || "foo";',
			errors: [error]
		},
		{
			code: 'node.appendChild(child) + 0;',
			output: 'node.appendChild(child) + 0;',
			errors: [error]
		},
		{
			code: 'node.appendChild(child) + 0;',
			output: 'node.appendChild(child) + 0;',
			errors: [error]
		},
		{
			code: '+node.appendChild(child);',
			output: '+node.appendChild(child);',
			errors: [error]
		},
		{
			code: 'node.appendChild(child) ? "foo" : "bar";',
			output: 'node.appendChild(child) ? "foo" : "bar";',
			errors: [error]
		},
		{
			code: 'if (node.appendChild(child)) {}',
			output: 'if (node.appendChild(child)) {}',
			errors: [error]
		},
		{
			code: 'const foo = [node.appendChild(child)]',
			output: 'const foo = [node.appendChild(child)]',
			errors: [error]
		},
		{
			code: 'const foo = { bar: node.appendChild(child) }',
			output: 'const foo = { bar: node.appendChild(child) }',
			errors: [error]
		},
		{
			code: 'function foo() { return node.appendChild(child); }',
			output: 'function foo() { return node.appendChild(child); }',
			errors: [error]
		},
		{
			code: 'const foo = () => { return node.appendChild(child); }',
			output: 'const foo = () => { return node.appendChild(child); }',
			errors: [error]
		}
	]
});
