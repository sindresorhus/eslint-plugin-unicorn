import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';
import notDomNodeTypes from './utils/not-dom-node-types.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'element.toggleAttribute("hidden")',
		'element.toggleAttribute("hidden", condition)',
		'element.setAttribute("hidden", "hidden")',
		'element.setAttribute("data-hidden", "")',
		outdent`
			if (condition) {
				element.setAttribute('hidden', 'hidden');
			} else {
				element.removeAttribute('hidden');
			}
		`,
		outdent`
			if (condition) {
				element.setAttribute('hidden', '');
			} else {
				element.removeAttribute('disabled');
			}
		`,
		outdent`
			if (condition) {
				element.setAttribute('hidden', '');
			} else {
				otherElement.removeAttribute('hidden');
			}
		`,
		outdent`
			if (condition) {
				element.setAttribute('data-hidden', '');
			} else {
				element.removeAttribute('data-hidden');
			}
		`,
		outdent`
			if (condition) {
				element.setAttribute('hidden', '');
				foo();
			} else {
				element.removeAttribute('hidden');
			}
		`,
		outdent`
			if (condition) {
				element.setAttribute?.('hidden', '');
			} else {
				element.removeAttribute('hidden');
			}
		`,
		outdent`
			if (condition) {
				element?.setAttribute('hidden', '');
			} else {
				element.removeAttribute('hidden');
			}
		`,
		outdent`
			if (condition) {
				element?.setAttribute('hidden', '');
			} else {
				element?.removeAttribute('hidden');
			}
		`,
		outdent`
			if (condition) {
				element?.removeAttribute('hidden');
			} else {
				element?.setAttribute('hidden', '');
			}
		`,
		outdent`
			if (foo.bar.hasAttribute('hidden')) {
				foo?.bar.removeAttribute('hidden');
			} else {
				foo?.bar.setAttribute('hidden', '');
			}
		`,
		outdent`
			if (foo.bar.hasAttribute('hidden')) {
				foo.bar.removeAttribute('hidden');
			} else {
				foo?.bar.setAttribute('hidden', '');
			}
		`,
		outdent`
			if (foo?.bar.hasAttribute('hidden')) {
				foo?.bar.removeAttribute('hidden');
			} else {
				foo?.bar.setAttribute('hidden', '');
			}
		`,
		outdent`
			if (condition) {
				element.setAttributeNS(namespace, 'hidden', '');
			} else {
				element.removeAttributeNS(namespace, 'hidden');
			}
		`,
		{
			code: outdent`
				const element: string = '';
				if (condition) {
					element.setAttribute('hidden', '');
				} else {
					element.removeAttribute('hidden');
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				if (condition) {
					element.setAttribute('hidden', '');
				} else {
					(element as string).removeAttribute('hidden');
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		...notDomNodeTypes.map(data => outdent`
			if (condition) {
				(${data}).setAttribute('hidden', '');
			} else {
				(${data}).removeAttribute('hidden');
			}
		`),
	],
	invalid: [
		outdent`
			if (condition) {
				element.setAttribute('hidden', '');
			} else {
				element.removeAttribute('hidden');
			}
		`,
		outdent`
			if (element.hasAttribute('hidden'))
				element.removeAttribute('hidden');
			else
				element.setAttribute('hidden', '');
		`,
		outdent`
			if (condition) {
				element.removeAttribute('hidden');
			} else {
				element.setAttribute('hidden', '');
			}
		`,
		outdent`
			if (!condition) {
				element.removeAttribute('hidden');
			} else {
				element.setAttribute('hidden', '');
			}
		`,
		outdent`
			if (0, condition) {
				element.setAttribute('hidden', '');
			} else {
				element.removeAttribute('hidden');
			}
		`,
		outdent`
			if (element.hasAttribute('hidden')) {
				element.removeAttribute('hidden');
			} else {
				element.setAttribute('hidden', '');
			}
		`,
		outdent`
			if (!element.hasAttribute('hidden')) {
				element.setAttribute('hidden', '');
			} else {
				element.removeAttribute('hidden');
			}
		`,
		outdent`
			if (element.hasAttribute('hidden')) {
				element.setAttribute('hidden', '');
			} else {
				element.removeAttribute('hidden');
			}
		`,
		outdent`
			if (condition) {
				(( element )).setAttribute('hidden', '');
			} else {
				element.removeAttribute('hidden');
			}
		`,
		outdent`
			foo

			if (condition) {
				(( element )).setAttribute('hidden', '')
			} else {
				element.removeAttribute('hidden')
			}
		`,
		outdent`
			if (condition) {
				element.setAttribute(name, '');
			} else {
				element.removeAttribute(name);
			}
		`,
		outdent`
			if (element?.hasAttribute('hidden')) {
				element?.removeAttribute('hidden');
			} else {
				element?.setAttribute('hidden', '');
			}
		`,
		{
			code: outdent`
				if (condition) {
					(element as Element).setAttribute('hidden', '');
				} else {
					(element as Element).removeAttribute('hidden');
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				if (condition) {
					element!.setAttribute('hidden', '');
				} else {
					element!.removeAttribute('hidden');
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			if (condition) {
				element.setAttribute(/* comment */ 'hidden', '');
			} else {
				element.removeAttribute('hidden');
			}
		`,
	],
});

test.snapshot({
	valid: [
		'condition ? element.setAttribute("hidden", "hidden") : element.removeAttribute("hidden")',
		'condition ? element.setAttribute("hidden", "") : element.removeAttribute("disabled")',
		'condition ? element.setAttribute?.("hidden", "") : element.removeAttribute("hidden")',
		'condition ? element?.setAttribute("hidden", "") : element.removeAttribute("hidden")',
		'condition ? element?.setAttribute("hidden", "") : element?.removeAttribute("hidden")',
	],
	invalid: [
		'condition ? element.setAttribute("hidden", "") : element.removeAttribute("hidden")',
		'condition ? element.removeAttribute("hidden") : element.setAttribute("hidden", "")',
		'element.hasAttribute("hidden") ? element.removeAttribute("hidden") : element.setAttribute("hidden", "")',
		'!element.hasAttribute("hidden") ? element.setAttribute("hidden", "") : element.removeAttribute("hidden")',
		'const toggle = condition ? element.setAttribute("hidden", "") : element.removeAttribute("hidden")',
		'const toggle = element.hasAttribute("hidden") ? element.removeAttribute("hidden") : element.setAttribute("hidden", "")',
		outdent`
			function foo() {
				return!condition ? element.setAttribute('hidden', '') : element.removeAttribute('hidden')
			}
		`,
	],
});
