import {outdent} from 'outdent';
import {test} from './utils/test.js';
import notDomNodeTypes from './utils/not-dom-node-types.js';

const error = {
	message: 'Prefer `Node#append()` over `Node#appendChild()`.'
};

test({
	valid: [
		// Already using `append`
		'parent.append(child);',
		// Not `CallExpression`
		'new parent.appendChild(child);',
		// Not `MemberExpression`
		'appendChild(child);',
		// `callee.property` is not a `Identifier`
		'parent[\'appendChild\'](child);',
		// Computed
		'parent[appendChild](child);',
		// Not `appendChild`
		'parent.foo(child);',
		// More or less argument(s)
		'parent.appendChild(one, two);',
		'parent.appendChild();',
		'parent.appendChild(...argumentsArray)',
		// `callee.object` is not a DOM Node,
		...notDomNodeTypes.map(data => `(${data}).appendChild(foo)`),
		// First argument is not a DOM Node,
		...notDomNodeTypes.map(data => `foo.appendChild(${data})`)
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
			code: 'node.appendChild(foo)',
			output: 'node.append(foo)',
			errors: [error]
		},
		{
			code: outdent`
				function foo() {
					node.appendChild(bar);
				}
			`,
			output: outdent`
				function foo() {
					node.append(bar);
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
		},
		{
			code: 'foo(bar = node.appendChild(child))',
			output: 'foo(bar = node.appendChild(child))',
			errors: [error]
		}
	]
});
