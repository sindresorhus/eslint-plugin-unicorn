import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-modern-dom-apis';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

ruleTester.run('prefer-modern-dom-apis', rule, {
	valid: [
		'oldChildNode.replaceWith(newChildNode);',
		'referenceNode.before(newNode);',
		'referenceNode.before("text");',
		'referenceNode.prepend(newNode);',
		'referenceNode.prepend("text");',
		'referenceNode.append(newNode);',
		'referenceNode.append("text");',
		'referenceNode.after(newNode);',
		'referenceNode.after("text");'
	],
	invalid: [
		// Tests for .replaceChild()
		{
			code: 'parentNode.replaceChild(newChildNode, oldChildNode);',
			errors: [
				{
					message:
						'Prefer `oldChildNode.replaceWith(newChildNode)` over `parentNode.replaceChild(newChildNode, oldChildNode)`.'
				}
			],
			output: 'oldChildNode.replaceWith(newChildNode);'
		},
		// Tests for .insertBefore()
		{
			code: 'parentNode.insertBefore(newNode, referenceNode);',
			errors: [
				{
					message:
						'Prefer `referenceNode.before(newNode)` over `parentNode.insertBefore(newNode, referenceNode)`.'
				}
			],
			output: 'referenceNode.before(newNode);'
		},
		// Tests for .insertAdjacentText()
		{
			code: 'referenceNode.insertAdjacentText("beforebegin", "text");',
			errors: [
				{
					message:
						'Prefer `referenceNode.before("text")` over `referenceNode.insertAdjacentText("beforebegin", "text")`.'
				}
			],
			output: 'referenceNode.before("text");'
		},
		{
			code: 'referenceNode.insertAdjacentText("afterbegin", "text");',
			errors: [
				{
					message:
						'Prefer `referenceNode.prepend("text")` over `referenceNode.insertAdjacentText("afterbegin", "text")`.'
				}
			],
			output: 'referenceNode.prepend("text");'
		},
		{
			code: 'referenceNode.insertAdjacentText("beforeend", "text");',
			errors: [
				{
					message:
						'Prefer `referenceNode.append("text")` over `referenceNode.insertAdjacentText("beforeend", "text")`.'
				}
			],
			output: 'referenceNode.append("text");'
		},
		{
			code: 'referenceNode.insertAdjacentText("afterend", "text");',
			errors: [
				{
					message:
						'Prefer `referenceNode.after("text")` over `referenceNode.insertAdjacentText("afterend", "text")`.'
				}
			],
			output: 'referenceNode.after("text");'
		},
		// Tests for .insertAdjacentElement()
		{
			code: 'referenceNode.insertAdjacentElement("beforebegin", newNode);',
			errors: [
				{
					message:
						'Prefer `referenceNode.before(newNode)` over `referenceNode.insertAdjacentElement("beforebegin", newNode)`.'
				}
			],
			output: 'referenceNode.before(newNode);'
		},
		{
			code: 'referenceNode.insertAdjacentElement("afterbegin", "text");',
			errors: [
				{
					message:
						'Prefer `referenceNode.prepend("text")` over `referenceNode.insertAdjacentElement("afterbegin", "text")`.'
				}
			],
			output: 'referenceNode.prepend("text");'
		},
		{
			code: 'referenceNode.insertAdjacentElement("beforeend", "text");',
			errors: [
				{
					message:
						'Prefer `referenceNode.append("text")` over `referenceNode.insertAdjacentElement("beforeend", "text")`.'
				}
			],
			output: 'referenceNode.append("text");'
		},
		{
			code: 'referenceNode.insertAdjacentElement("afterend", newNode);',
			errors: [
				{
					message:
						'Prefer `referenceNode.after(newNode)` over `referenceNode.insertAdjacentElement("afterend", newNode)`.'
				}
			],
			output: 'referenceNode.after(newNode);'
		}
	]
});
