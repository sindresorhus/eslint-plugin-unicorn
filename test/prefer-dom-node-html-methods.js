import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'innerHTML;',
		'element.getHTML();',
		'element.setHTML(html);',
		'element.innerHTML = html;',
		'element.innerHTML = "<h2>Mambo No. 2</h2>";',
		'(element || fallback).innerHTML = html;',
		'element.innerHTML += html;',
		'const html = element.innerHTML = value;',
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
		'element.innerHTML();',
		'new element.innerHTML();',
		'element.innerHTML`html`;',
		{
			code: outdent`
				element
					.innerHTML = html;
			`,
			options: [{checkSetHTML: true}],
		},
		outdent`
			element.innerHTML /* comment */;
		`,
		{
			code: outdent`
				element.innerHTML = /* comment */ html;
			`,
			options: [{checkSetHTML: true}],
		},
	],
});

test.snapshot({
	valid: [
		{
			code: 'element.innerHTML;',
			options: [{checkGetHTML: false}],
		},
		{
			code: 'element.innerHTML = html;',
			options: [{checkGetHTML: false}],
		},
		{
			code: 'element.innerHTML = html;',
			options: [{checkSetHTML: false}],
		},
	],
	invalid: [
		{
			code: 'const html = element.innerHTML;',
			options: [{checkSetHTML: true}],
		},
		{
			code: 'element.innerHTML = html;',
			options: [{checkSetHTML: true}],
		},
		{
			code: 'element.innerHTML = "<h2>Mambo No. 2</h2>";',
			options: [{checkSetHTML: true}],
		},
		{
			code: '(element || fallback).innerHTML = html;',
			options: [{checkSetHTML: true}],
		},
		{
			code: 'element.innerHTML += html;',
			options: [{checkSetHTML: true}],
		},
		{
			code: 'const html = element.innerHTML = value;',
			options: [{checkSetHTML: true}],
		},
		{
			code: 'element.innerHTML = html;',
			options: [{checkGetHTML: false, checkSetHTML: true}],
		},
	],
});
