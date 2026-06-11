import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'innerHTML;',
		'element.getHTML();',
		'element.setHTML(html);',
		'element.textContent;',
		'element.outerHTML;',
		'element.insertAdjacentHTML("beforeend", html);',
		'element[innerHTML];',
		'element["innerHTML"];',
		'element[`innerHTML`];',
		'const {innerHTML} = element;',
		'({innerHTML} = element);',
		'element.innerHTML++;',
		'delete element.innerHTML;',
		'for (element.innerHTML in object) {}',
		'for (element.innerHTML of list) {}',
	],
	invalid: [
		'element.innerHTML;',
		'element?.innerHTML;',
		'const html = element.innerHTML;',
		'element.innerHTML.trim();',
		'(element || fallback).innerHTML;',
		'element.innerHTML = html;',
		'element.innerHTML = "<h2>Mambo No. 2</h2>";',
		'(element || fallback).innerHTML = html;',
		'element.innerHTML += html;',
		'const html = element.innerHTML = value;',
		'element.innerHTML();',
		'new element.innerHTML();',
		'element.innerHTML`html`;',
		outdent`
			element
				.innerHTML = html;
		`,
		outdent`
			element.innerHTML /* comment */;
		`,
		outdent`
			element.innerHTML = /* comment */ html;
		`,
	],
});
