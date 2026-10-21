import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		...[
			['getElement(/* keep */).innerHTML;', 'getElement(/* keep */).getHTML();'],
			['element./* keep */innerHTML;', 'element./* keep */getHTML();'],
		].map(([code, output]) => ({code, output, errors: [{messageId: 'prefer-dom-node-html-methods/read'}]})),
		...[
			['getElement(/* keep */).innerHTML = getMarkup();', 'getElement(/* keep */).setHTML(getMarkup());'],
			['element.innerHTML = (/* keep */ markup);', 'element.setHTML((/* keep */ markup));'],
		].map(([code, output]) => ({
			code,
			options: [{checkSetHTML: true}],
			errors: [{messageId: 'prefer-dom-node-html-methods/write', suggestions: [{messageId: 'prefer-dom-node-html-methods/write-suggestion', output}]}],
		})),
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'element.// keep\r\ninnerHTML;',
			output: 'element.// keep\r\ngetHTML();',
			errors: 1,
		},
		{
			code: '(element as /* keep */ Element).innerHTML;',
			output: '(element as /* keep */ Element).getHTML();',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		...[
			['element.innerHTML = getMarkup(\r\n  // keep\r\n);', 'element.setHTML(getMarkup(\r\n  // keep\r\n));'],
			['(/* keep */ element).innerHTML = markup;', '(/* keep */ element).setHTML(markup);'],
		].map(([code, output]) => ({
			code,
			options: [{checkSetHTML: true}],
			errors: [{messageId: 'prefer-dom-node-html-methods/write', suggestions: [{messageId: 'prefer-dom-node-html-methods/write-suggestion', output}]}],
		})),
		...[
			'element./* keep */innerHTML = markup;',
			'element.innerHTML /* keep */ = markup;',
			'const value = element.innerHTML = getMarkup(/* keep */);',
		].map(code => ({code, options: [{checkSetHTML: true}], errors: [{messageId: 'prefer-dom-node-html-methods/write', suggestions: []}]})),
		...[
			'element./* keep */innerHTML();',
			'element./* keep */innerHTML`template`;',
		].map(code => ({code, errors: 1})),
	],
});

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
			output: 'new (element /* keep */ .getHTML()).constructor("value");',
			errors: 1,
		},
	],
});

nodeTest('getHTML replacement preserves an enclosing constructor', t => {
	const linter = new Linter();
	const code = 'new (getElement(/* keep */)).innerHTML.constructor("value").valueOf();';
	const config = {plugins: {unicorn: {rules: {'prefer-dom-node-html-methods': rule}}}, rules: {'unicorn/prefer-dom-node-html-methods': 'error'}};
	const {output, messages, fixed} = linter.verifyAndFix(code, config);
	const element = {
		innerHTML: '',
		getHTML: () => '',
	};
	t.assert.strictEqual(fixed, true);
	t.assert.deepStrictEqual(messages, []);
	t.assert.ok(output.includes('/* keep */'));
	for (const source of [code, output]) {
		let evaluations = 0;
		const result = runInNewContext(source, {
			getElement() {
				evaluations++;
				return element;
			},
		});
		t.assert.strictEqual(evaluations, 1);
		t.assert.strictEqual(result, 'value');
	}
});

// Type wrappers retain the existing callee and tag boundary.
test({
	valid: [],
	invalid: [
		'element.innerHTML!();',
		'(element.innerHTML as Function)`template`;',
	].map(code => ({code, languageOptions: {parser: parsers.typescript}, errors: 1})),
});

test({
	valid: [],
	invalid: [{
		code: '({element}.element.innerHTML) = content;',
		options: [{checkSetHTML: true}],
		errors: [{messageId: 'prefer-dom-node-html-methods/write', suggestions: [{messageId: 'prefer-dom-node-html-methods/write-suggestion', output: '({element}.element).setHTML(content);'}]}],
	}, {
		code: '((element)).innerHTML = content;',
		options: [{checkSetHTML: true}],
		errors: [{messageId: 'prefer-dom-node-html-methods/write', suggestions: [{messageId: 'prefer-dom-node-html-methods/write-suggestion', output: '((element)).setHTML(content);'}]}],
	}],
});

nodeTest('setHTML suggestions retain the receiver when assignment parentheses are removed', t => {
	const linter = new Linter();
	const code = '({element: getElement(/* keep */)}.element.innerHTML) = getContent(/* keep */); element.innerHTML;';
	const config = {
		plugins: {unicorn: {rules: {'prefer-dom-node-html-methods': rule}}},
		rules: {'unicorn/prefer-dom-node-html-methods': ['error', {checkSetHTML: true, checkGetHTML: false}]},
	};
	const [problem] = linter.verify(code, config);
	t.assert.strictEqual(problem.fix, undefined);
	t.assert.strictEqual(problem.suggestions?.length, 1);
	const {fix} = problem.suggestions[0];
	const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	t.assert.ok(output.includes('/* keep */'));
	const execute = source => {
		const events = [];
		const element = {
			setHTML(content) {
				t.assert.strictEqual(this, element);
				// Model the original property write in this fake element.
				Object.assign(element, {innerHTML: content});
			},
		};
		const result = runInNewContext(source, {
			element,
			getElement() {
				events.push('receiver');
				return element;
			},
			getContent() {
				events.push('content');
				return '<p>text</p>';
			},
		});
		t.assert.deepStrictEqual(events, ['receiver', 'content']);
		return result;
	};

	t.assert.strictEqual(execute(code), '<p>text</p>');
	t.assert.strictEqual(execute(output), execute(code));
	t.assert.deepStrictEqual(linter.verify(output, config), []);
});
