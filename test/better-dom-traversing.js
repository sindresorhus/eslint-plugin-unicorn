import outdent from 'outdent';
import {getTester} from './utils/test.js';
import notDomNodeTypes from './utils/not-dom-node-types.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Already preferred APIs
		'element.firstChild;',
		'element.firstElementChild;',
		'element.querySelector("li");',
		'element.closest("form");',

		// Not a `MemberExpression`
		'children[0];',
		'parentElement.parentElement;',

		// Non-literal and unsupported indexes
		'element.children[index];',
		'element.children["0"];',
		'element.children[-1];',
		'element.children[1.5];',
		'element.childNodes[index];',
		'element.childNodes[1];',

		// Computed collection names
		'element["children"][0];',
		'element[children][0];',
		'element["childNodes"][0];',
		'element[childNodes][0];',
		'element["parentElement"].parentElement;',
		'element.parentElement["parentElement"];',

		// Optional chaining
		'element?.children[0];',
		'element.children?.[0];',
		'element?.parentElement.parentElement;',
		'element.parentElement?.parentElement;',
		'element.querySelector?.("a").querySelector("b");',
		'element.querySelector("a")?.querySelector("b");',
		'element.querySelector?.("a").querySelector("b").querySelector("c");',
		'element.querySelector("a")?.querySelector("b").querySelector("c");',
		'element.querySelector("a").querySelector("b")?.querySelector("c");',
		'element.querySelector("a").querySelector("b")?.foo;',
		'element.querySelector("a").querySelector("b").foo?.querySelector("c");',
		'(element?.querySelector("a")).querySelector("b").querySelector("c");',

		// Wrong selector methods or arguments
		'element.querySelector();',
		'element.querySelector("a", root).querySelector("b");',
		'element.querySelector("a").querySelector();',
		'element.querySelector("a").querySelector("b", root);',
		'element.querySelectorAll("a").querySelector("b");',
		'element.querySelector("a").querySelectorAll("b");',

		// Non-static selectors
		'element.querySelector(selector).querySelector("b");',
		'element.querySelector("a").querySelector(selector);',
		'element.querySelector(`${selector}`).querySelector("b");', // eslint-disable-line no-template-curly-in-string
		'element.querySelector("a").querySelector(`${selector}`);', // eslint-disable-line no-template-curly-in-string
		'element.querySelector(tag`a`).querySelector("b");',

		// `callee.object` is not a DOM Node
		...notDomNodeTypes.map(data => `(${data}).children[0];`),
		...notDomNodeTypes.map(data => `(${data}).childNodes[0];`),
		...notDomNodeTypes.map(data => `(${data}).parentElement.parentElement;`),
		...notDomNodeTypes.map(data => `(${data}).querySelector("a").querySelector("b");`),
	],
	invalid: [
		'element.childNodes[0];',
		'element.children[0];',
		'element.children[1];',
		'element.children[10];',
		'element.children[1].children[2];',
		'element.parentElement.parentElement;',
		'element.parentElement.parentElement.parentElement;',
		'element.querySelector("a").querySelector("b");',
		'document.querySelector("a").querySelector("b");',
		'document.body.querySelector("a").querySelector("b");',
		'element.querySelector(\'a\').querySelector(\'b\');',
		'element.querySelector(`a`).querySelector(`b`);',
		'element.querySelector("a").querySelector(`b`);',
		'element.querySelector("a > b").querySelector(".c");',
		'element.querySelector(".a, .b").querySelector(".c");',
		'element.querySelector(".a").querySelector(".b, .c");',
		'element.querySelector(":scope a").querySelector("b");',
		'element.querySelector("a").querySelector("b").querySelector("c");',
		'element.querySelector("a").querySelector("b").querySelector(selector);',
		'element.querySelector(selector).querySelector("b").querySelector("c");',
		'(getElement()).querySelector("a").querySelector("b");',
		'(foo || bar).querySelector("a").querySelector("b");',

		// Report, but do not suggest fixes that would drop comments.
		'element.childNodes[/* comment */ 0];',
		'element.children[/* comment */ 0];',
		'element.querySelector(/* comment */ "a").querySelector("b");',
		'element.querySelector("a").querySelector(/* comment */ "b");',

		outdent`
			const item = element
				.children[0];
		`,
		outdent`
			const item = element
				.querySelector("a")
				.querySelector("b");
		`,
	],
});
