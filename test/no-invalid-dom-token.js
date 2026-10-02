/* eslint-disable no-template-curly-in-string */
import test from 'ava';
import {Linter} from 'eslint';
import {parse} from 'espree';
import unicorn from '../index.js';
import {getTester, parsers} from './utils/test.js';
import {DEFAULT_LANGUAGE_OPTIONS} from './utils/language-options.js';
import notDomNodeTypes from './utils/not-dom-node-types.js';

const {test: ruleTest} = getTester(import.meta);
const methods = ['add', 'remove', 'toggle', 'replace'];
const whitespaceEscapes = [String.raw`\t`, String.raw`\n`, String.raw`\f`, String.raw`\r`, ' '];
const validWhitespaceEscapes = [String.raw`\v`, String.raw`\u0085`, String.raw`\u00A0`, String.raw`\u2003`, String.raw`\u2028`, String.raw`\u2029`, String.raw`\uFEFF`];
const tokenListProperties = ['classList', 'relList', 'sandbox', 'part', 'sizes', 'blocking', 'htmlFor', 'controlsList'];

ruleTest.snapshot({
	valid: [
		...methods.map(method => `element.classList.${method}("primary", "active");`),
		...validWhitespaceEscapes.map(whitespace => `element.classList.add("primary${whitespace}active");`),
		'element.classList.add(".primary", "#active", "a:b", "a,b", "123", "a/b", "💜");',
		'element.classList.add("primary", "primary");',
		'element.classList.add();',
		'element.classList.remove();',
		'element.classList.toggle("primary", " ", "");',
		'element.classList.replace("primary", "active", " ", "");',
		'element.classList.contains("");',
		'element.classList.contains("primary active");',
		'element.classList.supports("primary active");',
		'element.classList.value = "primary active";',
		'element.className = "primary active";',
		'element.setAttribute("class", "primary active");',
		'element.getElementsByClassName("primary active");',
		'element.classList.add(token);',
		'element.classList.add(`${token}`);',
		'element.classList.add(`primary${suffix}`);',
		'element.classList.add(tag`primary active`);',
		'element.classList.add(0, false, null, undefined, [], {});',
		'element.classList.add(...tokens);',
		'element.classList.toggle(...tokens, "primary active");',
		'element.classList.replace(...tokens, "primary active");',
		'element.classList.replace("primary", ...tokens, "primary active");',
		'element.classList[method]("primary active");',
		'element[property].add("primary active");',
		'const method = "add"; element.classList[method]("primary active");',
		'const tokens = element.classList; tokens.add("primary active");',
		'class Component { #classList; update() { this.#classList.add("primary active"); } }',
		'classList.add("primary active");',
		'element.tokens.add("primary active");',
		'element.classList.add.call(element.classList, "primary active");',
		'new element.classList.add("primary active");',
		...notDomNodeTypes.map(value => `(${value}).classList.add("primary active");`),
		'const token = "primary"; element.classList.add(token);',
		'let token = "primary active"; element.classList.add(token);',
		'let token = "primary active"; token = "primary"; element.classList.add(token);',
		'const token = getToken(); element.classList.add(token);',
		'const token = "primary active".trim(); element.classList.add(token);',
		'element.classList.add((sideEffect(), "primary active"));',
		'element.classList.add(token); const token = "primary active";',
		'const options = {token: "primary active"}; options.token = "primary"; element.classList.add(options.token);',
		{code: '("string" as any).classList.add("primary active");', languageOptions: {parser: parsers.typescript}},
		{code: 'element.classList.add("primary" as string);', languageOptions: {parser: parsers.typescript}},
		'let token = "primary active"; const value = token; element.classList.add(value);',
	],
	invalid: [
		...methods.map(method => `element.classList.${method}("", "primary");`),
		...methods.flatMap(method => whitespaceEscapes.map(whitespace => `element.classList.${method}("primary${whitespace}active", "other");`)),
		...tokenListProperties.slice(1).map(property => `element.${property}.add("primary active");`),
		'element.classList.replace("primary", "");',
		'element.classList.replace("primary", "old new");',
		'element.classList.replace("", "old new");',
		'element.classList.add("primary active", "", "old new");',
		'element.classList.add(" primary");',
		'element.classList.remove("primary ");',
		'element.classList.add(" ");',
		String.raw`element.classList.add("\t\n\f\r ");`,
		String.raw`element.classList.add("primary\u0020active");`,
		String.raw`element.classList.remove("primary\x20active");`,
		'element.classList.add(``);',
		'element.classList.add(`primary active`);',
		'element.classList.add(`primary\nactive`);',
		'element.classList.add(`primary ${suffix}`);',
		'element.classList.add(`${prefix} active`);',
		'element.classList.add(`${prefix} ${suffix}`);',
		'element.classList.add(`primary\\t${suffix}`);',
		'element?.classList.add("primary active");',
		'element.classList?.add("primary active");',
		'element.classList.add?.("primary active");',
		'(element?.classList).add("primary active");',
		'element["classList"]["add"]("primary active");',
		'element[`classList`][`remove`]("primary active");',
		'(element).classList.add(("primary active"));',
		'element.classList.add((("primary active")));',
		'element.classList.add("before", "primary active", "after",);',
		'element.classList.add("primary active", ...tokens);',
		'element.classList.remove(...tokens, "primary active");',
		'element.classList.replace("primary active", ...tokens);',
		'const token = "primary active"; element.classList.add(token);',
		'const token = ""; element.classList.remove(token);',
		'const first = "primary"; const token = first + " active"; element.classList.add(token);',
		'element.classList.add("primary" + " active");',
		'const suffix = "active"; element.classList.add(`primary ${suffix}`);',
		'const token = Object.freeze("primary active"); element.classList.add(token);',
		'element.classList.add(true ? "primary active" : "primary");',
		{code: 'const view = <div>{element.classList.add("primary active")}</div>;', languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
		'element.classList.add(/* before */ "primary active" /* after */);',
		'element.classList.add((/* inside */ "primary active"));',
		'element.classList.add(("primary active" /* inside */));',
		String.raw`element.classList.add("primary's active\\name");`,
		'element.classList.add("primary active primary");',
		String.raw`element.classList.add("primary\u00A0active other");`,
		'if (condition) {\n    element.classList.add("primary active");\n}',
		'if (condition) {\r\n\telement.classList.add("primary active");\r\n}',
		...[
			'element.classList.add("primary active" as string);',
			'element.classList.add(<string>"primary active");',
			'element.classList.add("primary active"!);',
			'element.classList.add("primary active" satisfies string);',
			'(element as Element).classList.add("primary active");',
			'(element.classList as DOMTokenList).add("primary active");',
			'(element.classList.add as Function)("primary active");',
			'element!.classList.add("primary active");',
			'element.classList!.add("primary active");',
			'element.classList.add(("primary active" /* explanation */) as string);',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
		'element.classList.add(`primary ${getSuffix()}`);',
		'const suffix = " active"; element.classList.add(`primary${suffix}`);',
		'const token = ""; element.classList.remove(`${token}`);',
		{code: 'const token = "primary active" as const; element.classList.add(token);', languageOptions: {parser: parsers.typescript}},
		{code: '(element?.["classList"] as DOMTokenList)?.["add"]?.(("primary active" satisfies string)!);', languageOptions: {parser: parsers.typescript}},
	],
});

const config = {
	languageOptions: DEFAULT_LANGUAGE_OPTIONS,
	plugins: {unicorn},
	rules: {'unicorn/no-invalid-dom-token': 'error'},
};

test('split suggestions produce separate valid arguments without autofixing', t => {
	const linter = new Linter();
	const code = 'element.classList.add((("primary active")), "other");';
	const result = linter.verifyAndFix(code, config);
	t.false(result.fixed);
	t.is(result.output, code);
	t.is(result.messages.length, 1);
	const {fix} = result.messages[0].suggestions[0];
	const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	t.is(output, 'element.classList.add(\'primary\', \'active\', "other");');
	t.deepEqual(linter.verify(output, config), []);
});

test('split suggestions preserve allowed whitespace and escaped token characters', t => {
	const linter = new Linter();
	const tokens = [
		'primary\u000Bactive',
		'non\u00A0breaking',
		'line\u2028separator',
		'paragraph\u2029separator',
		'nul\u0000character',
		'surrogate\uD800',
		String.raw`back\slash`,
		'quote\'character',
		'💜',
		'💜',
	];
	const code = `element.classList.remove(${JSON.stringify(tokens.join(' '))});`;
	const messages = linter.verify(code, config);
	t.is(messages.length, 1);
	t.is(messages[0].suggestions.length, 1);
	const {fix} = messages[0].suggestions[0];
	const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	const arguments_ = parse(output, {ecmaVersion: 'latest'}).body[0].expression.arguments;
	t.deepEqual(arguments_.map(({value}) => value), tokens);
	t.deepEqual(linter.verify(output, config), []);
});

test('selector-prefix reports are independent of invalid-token reports', t => {
	const linter = new Linter();
	const messages = linter.verify('element.classList.add(".primary active");', {
		...config,
		rules: {...config.rules, 'unicorn/no-selector-as-dom-name': 'error'},
	});
	t.is(messages.length, 2);
	t.deepEqual(new Set(messages.map(({ruleId}) => ruleId)), new Set([
		'unicorn/no-invalid-dom-token',
		'unicorn/no-selector-as-dom-name',
	]));
});

test('invalid tokens remain detectable after sibling-rule autofixes', t => {
	const linter = new Linter();
	const cases = [
		['prefer-single-call', 'element.classList.add("primary active"); element.classList.add("other");', 'element.classList.add("primary active", "other");'],
		[
			'prefer-classlist-toggle',
			'if (condition) { element.classList.add("primary active"); } else { element.classList.remove("primary active"); }',
			'element.classList.toggle("primary active", condition);',
		],
	];
	for (const [rule, code, output] of cases) {
		const result = linter.verifyAndFix(code, {
			...config,
			rules: {...config.rules, [`unicorn/${rule}`]: 'error'},
		});
		t.true(result.fixed);
		t.is(result.output, output);
		t.is(result.messages.length, 1);
		t.is(result.messages[0].ruleId, 'unicorn/no-invalid-dom-token');
	}
});
