import outdent from 'outdent';
import {getTester} from './utils/test.mjs';
import notDomNodeTypes from './utils/not-dom-node-types.mjs';

const {test} = getTester(import.meta);

const ERROR_MESSAGE_ID = 'error';
const SUGGESTION_MESSAGE_ID = 'suggestion';

const invalidTestCase = ({code, output, suggestionOutput, suggestionOutputs}) => {
	if (suggestionOutput) {
		return {
			code,
			errors: [
				{
					messageId: ERROR_MESSAGE_ID,
					suggestions: [
						{
							messageId: SUGGESTION_MESSAGE_ID,
							data: {dotOrQuestionDot: '.'},
							output: suggestionOutput,
						},
					],
				},
			],
		};
	}

	if (suggestionOutputs) {
		return {
			code,
			errors: [
				{
					messageId: ERROR_MESSAGE_ID,
					suggestions: [
						{
							messageId: SUGGESTION_MESSAGE_ID,
							data: {dotOrQuestionDot: '?.'},
							output: suggestionOutputs[0],
						},
						{
							messageId: SUGGESTION_MESSAGE_ID,
							data: {dotOrQuestionDot: '.'},
							output: suggestionOutputs[1],
						},
					],
				},
			],
		};
	}

	return {
		code,
		output,
		errors: [
			{
				messageId: ERROR_MESSAGE_ID,
				suggestions: undefined,
			},
		],
	};
};

test({
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
		{
			code: 'parentNode.removeChild(foo)',
			output: 'foo.remove()',
		},
		{
			code: 'parentNode.removeChild(this)',
			output: 'this.remove()',
		},
		{
			code: 'parentNode.removeChild(some.node)',
			output: 'some.node.remove()',
		},
		{
			code: 'parentNode.removeChild(getChild())',
			output: 'getChild().remove()',
		},
		{
			code: 'parentNode.removeChild(lib.getChild())',
			output: 'lib.getChild().remove()',
		},
		{
			code: 'parentNode.removeChild((() => childNode)())',
			output: '(() => childNode)().remove()',
		},

		// Need parenthesized
		{
			code: outdent`
				async function foo () {
					parentNode.removeChild(
						await getChild()
					);
				}
			`,
			output: outdent`
				async function foo () {
					(await getChild()).remove();
				}
			`,
		},
		{
			code: outdent`
				async function foo () {
					parentNode.removeChild(
						(await getChild())
					);
				}
			`,
			output: outdent`
				async function foo () {
					(await getChild()).remove();
				}
			`,
		},
		{
			code: 'parentNode.removeChild((0, child))',
			output: '(0, child).remove()',
		},
		{
			code: 'parentNode.removeChild( (  (new Image)) )',
			output: '(  (new Image)).remove()',
		},
		{
			code: 'parentNode.removeChild( new Audio )',
			output: '(new Audio).remove()',
		},

		// Need semicolon
		{
			code: outdent`
				const array = []
				parentNode.removeChild([a, b, c].reduce(child => child, child))
			`,
			output: outdent`
				const array = []
				;[a, b, c].reduce(child => child, child).remove()
			`,
		},
		{
			code: outdent`
				async function foo () {
					const array = []
					parentNode.removeChild(
						await getChild()
					);
				}
			`,
			output: outdent`
				async function foo () {
					const array = []
					;(await getChild()).remove();
				}
			`,
		},
		{
			code: outdent`
				async function foo () {
					const array = []
					parentNode.removeChild(
						(0, childNode)
					);
				}
			`,
			output: outdent`
				async function foo () {
					const array = []
					;(0, childNode).remove();
				}
			`,
		},

		// Value of `parentNode.removeChild` call is use
		{
			code: 'if (parentNode.removeChild(foo)) {}',
			suggestionOutput: 'if (foo.remove()) {}',
		},
		{
			code: 'var removed = parentNode.removeChild(child);',
			suggestionOutput: 'var removed = child.remove();',
		},
		{
			code: 'const foo = parentNode.removeChild(child);',
			suggestionOutput: 'const foo = child.remove();',
		},
		{
			code: 'foo.bar(parentNode.removeChild(child));',
			suggestionOutput: 'foo.bar(child.remove());',
		},
		{
			code: 'parentNode.removeChild(child) || "foo";',
			suggestionOutput: 'child.remove() || "foo";',
		},
		{
			code: 'parentNode.removeChild(child) + 0;',
			suggestionOutput: 'child.remove() + 0;',
		},
		{
			code: '+parentNode.removeChild(child);',
			suggestionOutput: '+child.remove();',
		},
		{
			code: 'parentNode.removeChild(child) ? "foo" : "bar";',
			suggestionOutput: 'child.remove() ? "foo" : "bar";',
		},
		{
			code: 'if (parentNode.removeChild(child)) {}',
			suggestionOutput: 'if (child.remove()) {}',
		},
		{
			code: 'const foo = [parentNode.removeChild(child)]',
			suggestionOutput: 'const foo = [child.remove()]',
		},
		{
			code: 'const foo = { bar: parentNode.removeChild(child) }',
			suggestionOutput: 'const foo = { bar: child.remove() }',
		},
		{
			code: 'function foo() { return parentNode.removeChild(child); }',
			suggestionOutput: 'function foo() { return child.remove(); }',
		},
		{
			code: 'const foo = () => { return parentElement.removeChild(child); }',
			suggestionOutput: 'const foo = () => { return child.remove(); }',
		},
		{
			code: 'foo(bar = parentNode.removeChild(child))',
			suggestionOutput: 'foo(bar = child.remove())',
		},

		// `parentNode` has side effect
		{
			code: 'foo().removeChild(child)',
			suggestionOutput: 'child.remove()',
		},
		{
			code: 'foo[doSomething()].removeChild(child)',
			suggestionOutput: 'child.remove()',
		},
		// Optional parent
		{
			code: 'parentNode?.removeChild(foo)',
			suggestionOutputs: ['foo?.remove()', 'foo.remove()'],
		},
		{
			code: 'foo?.parentNode.removeChild(foo)',
			output: 'foo?.remove()',
		},
		{
			code: 'foo.parentNode?.removeChild(foo)',
			suggestionOutputs: ['foo?.remove()', 'foo.remove()'],
		},
		{
			code: 'foo?.parentNode?.removeChild(foo)',
			suggestionOutputs: ['foo?.remove()', 'foo.remove()'],
		},
		{
			code: 'foo.bar?.parentNode.removeChild(foo.bar)',
			suggestionOutputs: ['foo.bar?.remove()', 'foo.bar.remove()'],
		},
		{
			code: 'a.b?.c.parentNode.removeChild(foo)',
			suggestionOutputs: ['foo?.remove()', 'foo.remove()'],
		},
		{
			code: 'a[b?.c].parentNode.removeChild(foo)',
			output: 'foo.remove()',
		},
		{
			code: 'a?.b.parentNode.removeChild(a.b)',
			suggestionOutputs: ['a.b?.remove()', 'a.b.remove()'],
		},
	].map(options => invalidTestCase(options)),
});
