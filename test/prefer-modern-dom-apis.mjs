import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

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
		// Argument is `Identifier` but is `undefined`
		'oldChildNode.replaceWith(undefined, oldNode);',
		'oldChildNode.replaceWith(newNode, undefined);',
		// Not `CallExpression`
		'new parentNode.replaceChild(newNode, oldNode);',
		'new parentNode.insertBefore(newNode, referenceNode);',
		'new referenceNode.insertAdjacentText(\'beforebegin\', \'text\');',
		'new referenceNode.insertAdjacentElement(\'beforebegin\', newNode);',
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
		// Not a legacy api
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
			output: 'oldChildNode.replaceWith(newChildNode);',
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
			output: 'referenceNode.after(newNode); // inline comments',
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
	],
});
