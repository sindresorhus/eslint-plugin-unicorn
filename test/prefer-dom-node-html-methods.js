import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

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
		// A sequence expression must stay parenthesized, it is not two arguments
		{
			code: 'element.innerHTML = (a, b);',
			options: [{checkSetHTML: true}],
		},
		{
			code: 'element.innerHTML = (a, (b, c));',
			options: [{checkSetHTML: true}],
		},
	],
});

// A call introduced inside a constructor member chain must stay grouped.
test({
	valid: [],
	invalid: [{
		code: 'new element.innerHTML.constructor("value");',
		output: 'new (element.getHTML()).constructor("value");',
		errors: 1,
	}],
});

test({
	valid: [],
	invalid: [
		...[
			['new (element.innerHTML).constructor("value");', 'new (element.getHTML()).constructor("value");'],
			['new (element.innerHTML.constructor)("value");', 'new (element.getHTML().constructor)("value");'],
		].map(([code, output]) => ({code, output, errors: 1})),
		{
			code: 'new element.innerHTML!.constructor("value");',
			output: 'new (element.getHTML())!.constructor("value");',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: 'new element /* keep */ .innerHTML.constructor("value");',
			errors: 1,
		},
	],
});

nodeTest('getHTML replacement preserves an enclosing constructor', t => {
	const linter = new Linter();
	const code = 'new element.innerHTML.constructor("value").valueOf();';
	const config = {plugins: {unicorn: {rules: {'prefer-dom-node-html-methods': rule}}}, rules: {'unicorn/prefer-dom-node-html-methods': 'error'}};
	const {output, messages, fixed} = linter.verifyAndFix(code, config);
	const element = {
		innerHTML: '',
		getHTML() {
			return '';
		},
	};
	t.assert.strictEqual(fixed, true);
	t.assert.deepStrictEqual(messages, []);
	t.assert.strictEqual(runInNewContext(output, {element}), runInNewContext(code, {element}));
});

// Type wrappers retain the existing callee and tag boundary.
test({
	valid: [],
	invalid: [
		'element.innerHTML!();',
		'(element.innerHTML as Function)`template`;',
	].map(code => ({code, languageOptions: {parser: parsers.typescript}, errors: 1})),
});
