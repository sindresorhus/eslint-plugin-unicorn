import outdent from 'outdent';
import {getTester} from './utils/test.js';
import notDomNodeTypes from './utils/not-dom-node-types.js';

const {test} = getTester(import.meta);

test.snapshot({
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
		// Optional call
		'parentNode.removeChild?.(foo)',

		// `callee.object` is not a DOM Node,
		...notDomNodeTypes.map(data => `(${data}).removeChild(foo)`),
		// First argument is not a DOM Node,
		...notDomNodeTypes.map(data => `foo.removeChild(${data})`),
	],
	invalid: [
		// Auto fix
		'parentNode.removeChild(foo)',
		'parentNode.removeChild(this)',
		'parentNode.removeChild(some.node)',
		'parentNode.removeChild(getChild())',
		'parentNode.removeChild(lib.getChild())',
		'parentNode.removeChild((() => childNode)())',

		// Need parenthesized
		outdent`
			async function foo () {
				parentNode.removeChild(
					await getChild()
				);
			}
		`,
		outdent`
			async function foo () {
				parentNode.removeChild(
					(await getChild())
				);
			}
		`,
		'parentNode.removeChild((0, child))',
		'parentNode.removeChild( (  (new Image)) )',
		'parentNode.removeChild( new Audio )',

		// Need semicolon
		outdent`
			const array = []
			parentNode.removeChild([a, b, c].reduce(child => child, child))
		`,
		outdent`
			async function foo () {
				const array = []
				parentNode.removeChild(
					await getChild()
				);
			}
		`,
		outdent`
			async function foo () {
				const array = []
				parentNode.removeChild(
					(0, childNode)
				);
			}
		`,

		// Value of `parentNode.removeChild` call is use
		'if (parentNode.removeChild(foo)) {}',
		'var removed = parentNode.removeChild(child);',
		'const foo = parentNode.removeChild(child);',
		'foo.bar(parentNode.removeChild(child));',
		'parentNode.removeChild(child) || "foo";',
		'parentNode.removeChild(child) + 0;',
		'+parentNode.removeChild(child);',
		'parentNode.removeChild(child) ? "foo" : "bar";',
		'if (parentNode.removeChild(child)) {}',
		'const foo = [parentNode.removeChild(child)]',
		'const foo = { bar: parentNode.removeChild(child) }',
		'function foo() { return parentNode.removeChild(child); }',
		'const foo = () => { return parentElement.removeChild(child); }',
		'foo(bar = parentNode.removeChild(child))',

		// `parentNode` has side effect
		'foo().removeChild(child)',
		'foo[doSomething()].removeChild(child)',
		// Optional parent
		'parentNode?.removeChild(foo)',
		'foo?.parentNode.removeChild(foo)',
		'foo.parentNode?.removeChild(foo)',
		'foo?.parentNode?.removeChild(foo)',
		'foo.bar?.parentNode.removeChild(foo.bar)',
		'a.b?.c.parentNode.removeChild(foo)',
		'a[b?.c].parentNode.removeChild(foo)',
		// The suggestions are bad, since they will break code
		'a?.b.parentNode.removeChild(a.b)',
	],
});
