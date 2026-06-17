import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test({
	valid: [
		'oldChildNode.replaceWith(newChildNode);',
		'referenceNode.before(newNode);',
		'referenceNode.before("text");',
		'referenceNode.prepend(newNode);',
		'referenceNode.prepend("text");',
		'referenceNode.append(newNode);',
		'referenceNode.append("text");',
		'referenceNode.after(newNode);',
		'referenceNode.after("text");',
		'while (node.firstElementChild) { node.firstElementChild.remove(); }',
		'while (node.lastElementChild) { node.lastElementChild.remove(); }',
		'while (node.firstChild) { node.lastChild.remove(); }',
		'while (node.lastChild) { otherNode.lastChild.remove(); }',
		'while (node.firstChild) { child = node.firstChild; child.remove(); }',
		'while (node.firstChild) { node.firstChild.remove(); node.normalize(); }',
		'while (getNode().firstChild) { getNode().firstChild.remove(); }',
		'while (nodes[getIndex()].lastChild) { nodes[getIndex()].lastChild.remove(); }',
		'while ((node?.parent).firstChild) { (node?.parent).firstChild.remove(); }',
		'while (node.firstChild) { node.firstChild?.remove(); }',
		'while (node.firstChild) { node.firstChild["remove"](); }',
		'while (node.firstChild) { node.removeChild(node.firstChild); }',
		'while (node.firstChild) { const child = node.firstChild; child.remove(); }',
		// The `replaceChildren` pattern only matches `while`, not `do…while` or `for`
		'do { node.firstChild.remove(); } while (node.firstChild)',
		'for (; node.firstChild;) { node.firstChild.remove(); }',
		'while ("x".firstChild) { "x".firstChild.remove(); }',
		'while (undefined.firstChild) { undefined.firstChild.remove(); }',
		typeAware('function foo(node: string) { while (node.firstChild) { node.firstChild.remove(); } }'),
		typeAware('function foo(node: Node) { while (node.firstChild) { node.firstChild.remove(); } }'),
		typeAware('function foo(node: Element | Node) { while (node.firstChild) { node.firstChild.remove(); } }'),
		typeAware('function foo(node: Element | {firstChild: {remove(): void} | undefined}) { while (node.firstChild) { node.firstChild.remove(); } }'),
		typeAware('function foo(node: {firstChild: {remove(): void} | undefined}) { while (node.firstChild) { node.firstChild.remove(); } }'),
		typeAware('function foo(node: {firstChild: {remove(): void} | undefined; replaceChildren: string}) { while (node.firstChild) { node.firstChild.remove(); } }'),
		typeAware('function foo(node: {firstChild: {remove(): void} | undefined; replaceChildren(value: string): void}) { while (node.firstChild) { node.firstChild.remove(); } }'),
		// Argument is `Identifier` but is `undefined`
		'oldChildNode.replaceWith(undefined, oldNode);',
		'oldChildNode.replaceWith(newNode, undefined);',
		// Not `CallExpression`
		'new parentNode.replaceChild(newNode, oldNode);',
		'new parentNode.insertBefore(newNode, referenceNode);',
		'new referenceNode.insertAdjacentText(\'beforebegin\', \'text\');',
		'new referenceNode.insertAdjacentElement(\'beforebegin\', newNode);',
		// Position must be a string literal, not a template literal
		'referenceNode.insertAdjacentText(`beforebegin`, \'text\');',
		'referenceNode.insertAdjacentElement(`beforebegin`, newNode);',
		// Text content must be a `Literal` or `Identifier`, not a template literal
		'referenceNode.insertAdjacentText(\'beforebegin\', `text`);',
		// Not `MemberExpression`
		'replaceChild(newNode, oldNode);',
		'insertBefore(newNode, referenceNode);',
		'insertAdjacentText(\'beforebegin\', \'text\');',
		'insertAdjacentElement(\'beforebegin\', newNode);',
		// `callee.property` is not a `Identifier`
		'parentNode[\'replaceChild\'](newNode, oldNode);',
		'parentNode[\'insertBefore\'](newNode, referenceNode);',
		'referenceNode[\'insertAdjacentText\'](\'beforebegin\', \'text\');',
		'referenceNode[\'insertAdjacentElement\'](\'beforebegin\', newNode);',
		// Computed
		'parentNode[replaceChild](newNode, oldNode);',
		'parentNode[insertBefore](newNode, referenceNode);',
		'referenceNode[insertAdjacentText](\'beforebegin\', \'text\');',
		'referenceNode[insertAdjacentElement](\'beforebegin\', newNode);',
		// Not a legacy API
		'parent.foo(a, b);',
		// Less arguments
		'parentNode.replaceChild(newNode);',
		'parentNode.insertBefore(newNode);',
		'referenceNode.insertAdjacentText(\'beforebegin\');',
		'referenceNode.insertAdjacentElement(\'beforebegin\');',
		// More arguments
		'parentNode.replaceChild(newNode, oldNode, extra);',
		'parentNode.insertBefore(newNode, referenceNode, extra);',
		'referenceNode.insertAdjacentText(\'beforebegin\', \'text\', extra);',
		'referenceNode.insertAdjacentElement(\'beforebegin\', newNode, extra);',
		// `SpreadElement` arguments
		'parentNode.replaceChild(...argumentsArray1, ...argumentsArray2);',
		'parentNode.insertBefore(...argumentsArray1, ...argumentsArray2);',
		'referenceNode.insertAdjacentText(...argumentsArray1, ...argumentsArray2);',
		'referenceNode.insertAdjacentElement(...argumentsArray1, ...argumentsArray2);',
		// `position` argument is not listed
		'referenceNode.insertAdjacentText(\'foo\', \'text\');',
		'referenceNode.insertAdjacentElement(\'foo\', newNode);',
	],
	invalid: [
		// Tests for .replaceChild()
		{
			code: 'parentNode.replaceChild(newChildNode, oldChildNode);',
			errors: [
				{
					message:
						'Prefer `oldChildNode.replaceWith(newChildNode)` over `parentNode.replaceChild(newChildNode, oldChildNode)`.',
				},
			],
			output: 'oldChildNode.replaceWith(newChildNode);',
		},
		{
			code: outdent`
				parentNode.replaceChild(
					newChildNode,
					oldChildNode
				);
			`,
			errors: [
				{
					message:
						'Prefer `oldChildNode.replaceWith(newChildNode)` over `parentNode.replaceChild(newChildNode, oldChildNode)`.',
				},
			],
			output: 'oldChildNode.replaceWith(newChildNode);',
		},
		{
			code: outdent`
				parentNode.replaceChild( // inline comments
					newChildNode, // inline comments
					oldChildNode // inline comments
				);
			`,
			errors: [
				{
					message:
						'Prefer `oldChildNode.replaceWith(newChildNode)` over `parentNode.replaceChild(newChildNode, oldChildNode)`.',
				},
			],
		},
		{
			code: 'const foo = parentNode.replaceChild(newChildNode, oldChildNode);',
			errors: [
				{
					message:
						'Prefer `oldChildNode.replaceWith(newChildNode)` over `parentNode.replaceChild(newChildNode, oldChildNode)`.',
				},
			],
		},
		{
			code: 'foo = parentNode.replaceChild(newChildNode, oldChildNode);',
			errors: [
				{
					message:
						'Prefer `oldChildNode.replaceWith(newChildNode)` over `parentNode.replaceChild(newChildNode, oldChildNode)`.',
				},
			],
		},
		// Tests for .insertBefore()
		{
			code: 'parentNode.insertBefore(newNode, referenceNode);',
			errors: [
				{
					message:
						'Prefer `referenceNode.before(newNode)` over `parentNode.insertBefore(newNode, referenceNode)`.',
				},
			],
			output: 'referenceNode.before(newNode);',
		},
		{
			code: 'parentNode.insertBefore(alfa, beta).insertBefore(charlie, delta);',
			errors: [
				{
					message:
						'Prefer `beta.before(alfa)` over `parentNode.insertBefore(alfa, beta)`.',
				},
			],
		},
		{
			code: 'const foo = parentNode.insertBefore(alfa, beta);',
			errors: [
				{
					message:
						'Prefer `beta.before(alfa)` over `parentNode.insertBefore(alfa, beta)`.',
				},
			],
		},
		{
			code: 'foo = parentNode.insertBefore(alfa, beta);',
			errors: [
				{
					message:
						'Prefer `beta.before(alfa)` over `parentNode.insertBefore(alfa, beta)`.',
				},
			],
		},
		{
			code: 'new Dom(parentNode.insertBefore(alfa, beta))',
			errors: [
				{
					message:
					'Prefer `beta.before(alfa)` over `parentNode.insertBefore(alfa, beta)`.',
				},
			],
		},
		{
			/* eslint-disable no-template-curly-in-string */
			code: '`${parentNode.insertBefore(alfa, beta)}`',
			errors: [
				{
					message:
					'Prefer `beta.before(alfa)` over `parentNode.insertBefore(alfa, beta)`.',
				},
			],
			/* eslint-enable no-template-curly-in-string */
		},
		// Tests for .insertAdjacentText()
		{
			code: 'referenceNode.insertAdjacentText("beforebegin", "text");',
			errors: [
				{
					message:
						'Prefer `referenceNode.before("text")` over `referenceNode.insertAdjacentText("beforebegin", "text")`.',
				},
			],
			output: 'referenceNode.before("text");',
		},
		{
			code: 'referenceNode.insertAdjacentText("afterbegin", "text");',
			errors: [
				{
					message:
						'Prefer `referenceNode.prepend("text")` over `referenceNode.insertAdjacentText("afterbegin", "text")`.',
				},
			],
			output: 'referenceNode.prepend("text");',
		},
		{
			code: 'referenceNode.insertAdjacentText("beforeend", "text");',
			errors: [
				{
					message:
						'Prefer `referenceNode.append("text")` over `referenceNode.insertAdjacentText("beforeend", "text")`.',
				},
			],
			output: 'referenceNode.append("text");',
		},
		{
			code: 'referenceNode.insertAdjacentText("afterend", "text");',
			errors: [
				{
					message:
						'Prefer `referenceNode.after("text")` over `referenceNode.insertAdjacentText("afterend", "text")`.',
				},
			],
			output: 'referenceNode.after("text");',
		},
		{
			code: 'const foo = referenceNode.insertAdjacentText("beforebegin", "text");',
			errors: [
				{
					message:
						'Prefer `referenceNode.before("text")` over `referenceNode.insertAdjacentText("beforebegin", "text")`.',
				},
			],
			output: 'const foo = referenceNode.before("text");',
		},
		{
			code: 'foo = referenceNode.insertAdjacentText("beforebegin", "text");',
			errors: [
				{
					message:
						'Prefer `referenceNode.before("text")` over `referenceNode.insertAdjacentText("beforebegin", "text")`.',
				},
			],
			output: 'foo = referenceNode.before("text");',
		},
		// Tests for .insertAdjacentElement()
		{
			code: 'referenceNode.insertAdjacentElement("beforebegin", newNode);',
			errors: [
				{
					message:
						'Prefer `referenceNode.before(newNode)` over `referenceNode.insertAdjacentElement("beforebegin", newNode)`.',
				},
			],
			output: 'referenceNode.before(newNode);',
		},
		{
			code: 'referenceNode.insertAdjacentElement("afterbegin", "text");',
			errors: [
				{
					message:
						'Prefer `referenceNode.prepend("text")` over `referenceNode.insertAdjacentElement("afterbegin", "text")`.',
				},
			],
			output: 'referenceNode.prepend("text");',
		},
		{
			code: 'referenceNode.insertAdjacentElement("beforeend", "text");',
			errors: [
				{
					message:
						'Prefer `referenceNode.append("text")` over `referenceNode.insertAdjacentElement("beforeend", "text")`.',
				},
			],
			output: 'referenceNode.append("text");',
		},
		{
			code: 'referenceNode.insertAdjacentElement("afterend", newNode);',
			errors: [
				{
					message:
						'Prefer `referenceNode.after(newNode)` over `referenceNode.insertAdjacentElement("afterend", newNode)`.',
				},
			],
			output: 'referenceNode.after(newNode);',
		},
		{
			code: outdent`
				referenceNode.insertAdjacentElement(
					"afterend",
					newNode
				);
			`,
			errors: [
				{
					message:
						'Prefer `referenceNode.after(newNode)` over `referenceNode.insertAdjacentElement("afterend", newNode)`.',
				},
			],
			output: 'referenceNode.after(newNode);',
		},
		{
			code: outdent`
				referenceNode.insertAdjacentElement( // inline comments
					"afterend", // inline comments
					newNode  // inline comments
				); // inline comments
			`,
			errors: [
				{
					message:
						'Prefer `referenceNode.after(newNode)` over `referenceNode.insertAdjacentElement("afterend", newNode)`.',
				},
			],
		},
		{
			code: 'const foo = referenceNode.insertAdjacentElement("beforebegin", newNode);',
			errors: [
				{
					message:
					'Prefer `referenceNode.before(newNode)` over `referenceNode.insertAdjacentElement("beforebegin", newNode)`.',
				},
			],
		},
		{
			code: 'foo = referenceNode.insertAdjacentElement("beforebegin", newNode);',
			errors: [
				{
					message:
					'Prefer `referenceNode.before(newNode)` over `referenceNode.insertAdjacentElement("beforebegin", newNode)`.',
				},
			],
		},
		{
			code: 'const foo = [referenceNode.insertAdjacentElement("beforebegin", newNode)]',
			errors: [
				{
					message:
					'Prefer `referenceNode.before(newNode)` over `referenceNode.insertAdjacentElement("beforebegin", newNode)`.',
				},
			],
		},
		{
			code: 'foo(bar = referenceNode.insertAdjacentElement("beforebegin", newNode))',
			errors: [
				{
					message:
					'Prefer `referenceNode.before(newNode)` over `referenceNode.insertAdjacentElement("beforebegin", newNode)`.',
				},
			],
		},
		{
			code: 'const foo = () => { return referenceNode.insertAdjacentElement("beforebegin", newNode); }',
			errors: [
				{
					message:
					'Prefer `referenceNode.before(newNode)` over `referenceNode.insertAdjacentElement("beforebegin", newNode)`.',
				},
			],
		},
		{
			code: 'if (referenceNode.insertAdjacentElement("beforebegin", newNode)) {}',
			errors: [
				{
					message:
					'Prefer `referenceNode.before(newNode)` over `referenceNode.insertAdjacentElement("beforebegin", newNode)`.',
				},
			],
		},
		{
			code: 'const foo = { bar: referenceNode.insertAdjacentElement("beforebegin", newNode) }',
			errors: [
				{
					message:
					'Prefer `referenceNode.before(newNode)` over `referenceNode.insertAdjacentElement("beforebegin", newNode)`.',
				},
			],
		},
		// Tests for .replaceChildren()
		{
			code: 'while (node.firstChild) { node.firstChild.remove(); }',
			errors: [
				{
					message: 'Prefer `node.replaceChildren()` over directly removing `.firstChild` in a loop.',
				},
			],
			output: 'node.replaceChildren();',
		},
		{
			code: 'while (node.lastChild) { node.lastChild.remove(); }',
			errors: [
				{
					message: 'Prefer `node.replaceChildren()` over directly removing `.lastChild` in a loop.',
				},
			],
			output: 'node.replaceChildren();',
		},
		{
			code: 'while (node.firstChild) node.firstChild.remove();',
			errors: [
				{
					message: 'Prefer `node.replaceChildren()` over directly removing `.firstChild` in a loop.',
				},
			],
			output: 'node.replaceChildren();',
		},
		{
			code: 'while (node.lastChild) node.lastChild.remove();',
			errors: [
				{
					message: 'Prefer `node.replaceChildren()` over directly removing `.lastChild` in a loop.',
				},
			],
			output: 'node.replaceChildren();',
		},
		{
			code: 'while (this.firstChild) { this.firstChild.remove(); }',
			errors: [
				{
					message: 'Prefer `this.replaceChildren()` over directly removing `.firstChild` in a loop.',
				},
			],
			output: 'this.replaceChildren();',
		},
		{
			code: 'class Foo extends Element { method() { while (super.firstChild) { super.firstChild.remove(); } } }',
			errors: [
				{
					message: 'Prefer `super.replaceChildren()` over directly removing `.firstChild` in a loop.',
				},
			],
			output: 'class Foo extends Element { method() { super.replaceChildren(); } }',
		},
		{
			code: 'while (parent.node.firstChild) { parent.node.firstChild.remove(); }',
			errors: [
				{
					message: 'Prefer `parent.node.replaceChildren()` over directly removing `.firstChild` in a loop.',
				},
			],
			output: 'parent.node.replaceChildren();',
		},
		{
			code: 'function foo(node: Element) { while (node.firstChild) { node.firstChild.remove(); } }',
			languageOptions: {parser: parsers.typescript},
			errors: [
				{
					message: 'Prefer `node.replaceChildren()` over directly removing `.firstChild` in a loop.',
				},
			],
			output: 'function foo(node: Element) { node.replaceChildren(); }',
		},
		{
			...typeAware('function foo(node: Element) { while (node.firstChild) { node.firstChild.remove(); } }'),
			errors: [
				{
					message: 'Prefer `node.replaceChildren()` over directly removing `.firstChild` in a loop.',
				},
			],
			output: 'function foo(node: Element) { node.replaceChildren(); }',
		},
		{
			...typeAware('function foo(node: DocumentFragment) { while (node.lastChild) { node.lastChild.remove(); } }'),
			errors: [
				{
					message: 'Prefer `node.replaceChildren()` over directly removing `.lastChild` in a loop.',
				},
			],
			output: 'function foo(node: DocumentFragment) { node.replaceChildren(); }',
		},
		{
			...typeAware('function foo(node: Document) { while (node.firstChild) { node.firstChild.remove(); } }'),
			errors: [
				{
					message: 'Prefer `node.replaceChildren()` over directly removing `.firstChild` in a loop.',
				},
			],
			output: 'function foo(node: Document) { node.replaceChildren(); }',
		},
		{
			...typeAware('function foo(node: Element | undefined) { while (node.firstChild) { node.firstChild.remove(); } }'),
			errors: [
				{
					message: 'Prefer `node.replaceChildren()` over directly removing `.firstChild` in a loop.',
				},
			],
			output: 'function foo(node: Element | undefined) { node.replaceChildren(); }',
		},
		{
			...typeAware('function foo<T extends Element>(node: T) { while (node.firstChild) { node.firstChild.remove(); } }'),
			errors: [
				{
					message: 'Prefer `node.replaceChildren()` over directly removing `.firstChild` in a loop.',
				},
			],
			output: 'function foo<T extends Element>(node: T) { node.replaceChildren(); }',
		},
		{
			code: 'function foo(node: Element) { while ((node as Element).firstChild) { (node as Element).firstChild.remove(); } }',
			languageOptions: {parser: parsers.typescript},
			errors: [
				{
					message: 'Prefer `(node as Element).replaceChildren()` over directly removing `.firstChild` in a loop.',
				},
			],
			output: 'function foo(node: Element) { (node as Element).replaceChildren(); }',
		},
		{
			code: outdent`
				foo()
				while ((node as Element).firstChild) {
					(node as Element).firstChild.remove();
				}
			`,
			languageOptions: {parser: parsers.typescript},
			errors: [
				{
					message: 'Prefer `(node as Element).replaceChildren()` over directly removing `.firstChild` in a loop.',
				},
			],
			output: outdent`
				foo()
				;(node as Element).replaceChildren();
			`,
		},
		{
			code: 'function foo(node: Element) { while ((<Element>node).lastChild) { (<Element>node).lastChild.remove(); } }',
			languageOptions: {parser: parsers.typescript},
			errors: [
				{
					message: 'Prefer `(<Element>node).replaceChildren()` over directly removing `.lastChild` in a loop.',
				},
			],
			output: 'function foo(node: Element) { (<Element>node).replaceChildren(); }',
		},
		{
			...typeAware('function foo(node: any) { while (node.firstChild) { node.firstChild.remove(); } }'),
			errors: [
				{
					message: 'Prefer `node.replaceChildren()` over directly removing `.firstChild` in a loop.',
				},
			],
			output: 'function foo(node: any) { node.replaceChildren(); }',
		},
		{
			...typeAware('function foo(node: {firstChild: {remove(): void} | undefined; replaceChildren(): void}) { while (node.firstChild) { node.firstChild.remove(); } }'),
			errors: [
				{
					message: 'Prefer `node.replaceChildren()` over directly removing `.firstChild` in a loop.',
				},
			],
			output: 'function foo(node: {firstChild: {remove(): void} | undefined; replaceChildren(): void}) { node.replaceChildren(); }',
		},
		{
			code: outdent`
				const array = []
				while ((node).firstChild) {
					(node).firstChild.remove();
				}
			`,
			errors: [
				{
					message: 'Prefer `node.replaceChildren()` over directly removing `.firstChild` in a loop.',
				},
			],
			output: outdent`
				const array = []
				node.replaceChildren();
			`,
		},
		{
			code: outdent`
				while (node.firstChild) {
					// Keep this comment.
					node.firstChild.remove();
				}
			`,
			errors: [
				{
					message: 'Prefer `node.replaceChildren()` over directly removing `.firstChild` in a loop.',
				},
			],
		},
	],
});
