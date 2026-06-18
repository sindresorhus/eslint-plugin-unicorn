/* eslint-disable no-template-curly-in-string */
import test from 'ava';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {getTester, parsers} from './utils/test.js';
import {DEFAULT_LANGUAGE_OPTIONS, mergeLanguageOptions} from './utils/language-options.js';
import notDomNodeTypes from './utils/not-dom-node-types.js';

const {test: ruleTest} = getTester(import.meta);

ruleTest.snapshot({
	valid: [
		'element.classList.add("foo");',
		'element.classList.remove("foo");',
		'element.classList.contains("foo");',
		'element.classList.toggle("foo");',
		'element.classList.replace("old", "new");',
		'element.classList.toggle("foo", ".bar");',
		'element.classList.replace("old", "new", ".extra");',
		'element.classList.add("foo.bar");',
		'element.classList.add(className);',
		'element.classList.add(`foo`);',
		'element.classList.add(`${className}`);',
		'element.classList.add(...classNames);',
		'element.classList.replace(...tokens, ".new");',
		{code: '("string" as any).classList.add(".foo");', languageOptions: {parser: parsers.typescript}},
		...notDomNodeTypes.map(value => `(${value}).classList.add(".foo");`),
		'element.classList["add"](".foo");',
		'element.classList[method](".foo");',
		'element.notClassList.add(".foo");',
		'classList.add(".foo");',
		'document.getElementsByClassName("foo");',
		'element.getElementsByClassName("foo");',
		'document.getElementsByClassName(className);',
		'document.getElementsByClassName(`foo`);',
		'document.getElementsByClassName(`${className}`);',
		{code: 'element.classList.add("foo" as string);', languageOptions: {parser: parsers.typescript}},
		{code: '(undefined as any).getElementsByClassName(".foo");', languageOptions: {parser: parsers.typescript}},
		...notDomNodeTypes.map(value => `(${value}).getElementsByClassName(".foo");`),
		'document.getElementById("foo");',
		'document.getElementById(id);',
		'document.getElementById(`foo`);',
		'document.getElementById(`${id}`);',
		...notDomNodeTypes.map(value => `(${value}).getElementById("#foo");`),
		'document.querySelector("#foo");',
		'element.setAttribute("class", ".foo");',
		'element.setAttribute("id", "#foo");',
	],
	invalid: [
		'element.classList.add(".foo");',
		'element.classList.add((".foo"));',
		'element.classList.add(\'.foo\');',
		'element.classList.add("#foo");',
		'element?.classList.add(".foo");',
		'element.classList?.add(".foo");',
		'element.classList.add?.(".foo");',
		'element.classList.remove(".foo");',
		'element.classList.contains(".foo");',
		'element.classList.toggle(".foo");',
		'element.classList.replace(".old", "new");',
		'element.classList.replace("old", ".new");',
		'element.classList.add(".foo", ".bar");',
		'element.classList.add(`.foo`);',
		'element.classList.add(`.${className}`);',
		'element.classList.add(`#${className}`);',
		'element.classList.add(`.${className}.bar`);',
		'element.classList.add(`.foo${suffix}`);',
		{code: 'element.classList.add(".foo" as string);', languageOptions: {parser: parsers.typescript}},
		{code: 'element.classList.replace("old", ".new" as string);', languageOptions: {parser: parsers.typescript}},
		{code: 'element.classList.add(".foo"!);', languageOptions: {parser: parsers.typescript}},
		{code: 'element.classList.add(".foo" satisfies string);', languageOptions: {parser: parsers.typescript}},
		{code: 'document.getElementsByClassName(<string>".foo");', languageOptions: {parser: parsers.typescript}},
		'document.getElementsByClassName(".foo");',
		'document.getElementsByClassName("#foo");',
		'document.getElementsByClassName(`.${className}`);',
		'document.getElementsByClassName(`#${className}`);',
		'document?.getElementsByClassName(".foo");',
		'document.getElementsByClassName?.(".foo");',
		'element.getElementsByClassName(".foo");',
		String.raw`element.classList.add("\u002efoo");`,
		'element.classList.add(`\\u002efoo`);',
		'element.classList.add(".foo.bar");',
		'element.classList.add(".foo .bar");',
		'element.classList.add(".foo, .bar");',
		'element.classList.add(".foo:hover");',
		'element.classList.add(".123");',
		'element.classList.add(".foo", ".bar.baz");',
		'document.getElementsByClassName(".foo.bar");',
		'document.getElementsByClassName(".foo .bar");',
		'document.getElementById("#foo");',
		'document.getElementById(("#foo"));',
		'document.getElementById(".foo");',
		'document.getElementById(\'#foo\');',
		'document?.getElementById("#foo");',
		'document.getElementById?.("#foo");',
		'document.getElementById(`#foo`);',
		'document.getElementById(`#${id}`);',
		'document.getElementById(`.${id}`);',
		'document.getElementById(`#${id}:hover`);',
		{code: 'document.getElementById("#foo" as string);', languageOptions: {parser: parsers.typescript}},
		String.raw`document.getElementById("\u0023foo");`,
		'document.getElementById(`\\u0023foo`);',
		'document.getElementById("#foo.bar");',
		'document.getElementById("#foo .bar");',
		'document.getElementById("#foo, #bar");',
		'document.getElementById("#foo:hover");',
		'document.getElementById("#123");',
	],
});

test('fixes selector-style DOM names before prefer-query-selector', t => {
	const linter = new Linter({configType: 'flat'});
	const config = {
		languageOptions: DEFAULT_LANGUAGE_OPTIONS,
		plugins: {
			unicorn,
		},
		rules: {
			'unicorn/no-selector-as-dom-name': 'error',
			'unicorn/prefer-query-selector': 'error',
		},
	};

	const cases = new Map([
		[
			'document.getElementsByClassName(".foo");',
			'document.querySelectorAll(".foo");',
		],
		[
			'document.getElementsByClassName(".foo")[0];',
			'document.querySelector(".foo");',
		],
		[
			'element.getElementsByClassName(".foo");',
			'element.querySelectorAll(":scope .foo");',
		],
		[
			'document.getElementById("#foo");',
			'document.querySelector("#foo");',
		],
		[
			{code: 'document.getElementsByClassName(".foo" as string);', languageOptions: {parser: parsers.typescript}},
			'document.querySelectorAll(".foo" as string);',
		],
		[
			{code: 'document.getElementById("#foo" as string);', languageOptions: {parser: parsers.typescript}},
			'document.querySelector("#foo" as string);',
		],
	]);

	for (const [testCase, output] of cases) {
		const {code, languageOptions} = typeof testCase === 'string' ? {code: testCase} : testCase;
		const result = linter.verifyAndFix(code, {
			...config,
			languageOptions: mergeLanguageOptions(config.languageOptions, languageOptions),
		});
		t.is(result.output, output);
		t.deepEqual(result.messages, []);
	}
});
