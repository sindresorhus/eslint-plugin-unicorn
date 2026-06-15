import {getTester, parsers} from './utils/test.js';
import notDomNodeTypes from './utils/not-dom-node-types.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Not `CallExpression`
		'new element.querySelector(".outer .inner");',
		// Not `MemberExpression`
		'querySelector(".outer .inner");',
		// `callee.property` is not an `Identifier`
		'element["querySelector"](".outer .inner");',
		// Computed
		'element[querySelector](".outer .inner");',
		// Not listed method
		'element.matches(".outer .inner");',
		// More or less argument(s)
		'element.querySelector();',
		'element.querySelector(".outer .inner", root);',
		'element.querySelector(...[".outer .inner"]);',

		// `callee.object` is not a DOM Node
		...notDomNodeTypes.map(data => `(${data}).querySelector(".outer .inner")`),

		'document.querySelector(".outer .inner");',
		'document.querySelectorAll(".outer .inner");',
		'window.document.querySelector(".outer .inner");',
		'globalThis.document.querySelectorAll(".outer .inner");',
		'element.querySelector(":scope .outer .inner");',
		'element.querySelectorAll(":scope .outer .inner");',
		'element.querySelector(".outer :scope .inner");',
		// Every branch of the selector list is scoped
		'element.querySelector(":scope .a, :scope .b");',
		// Commas nested in `:is()`/attribute strings are not list separators; not parsed deeper, so a leading `:scope` is accepted
		'element.querySelector(":scope div:is([title*=\', \'], div b)");',
		// Commas inside other functional pseudo-classes are not list separators
		'element.querySelector(":scope a:has(b, c)");',
		'element.querySelector(":scope :nth-child(2n of .a, .b)");',
		// A comma inside a comment is not a list separator; the real `:scope` makes it valid
		'element.querySelector(":scope /* , */ .a");',
		// Combinators are irrelevant; every branch is anchored with `:scope`
		'element.querySelector(":scope > .a, :scope + .b");',
		// Deeply nested functional pseudo-classes do not break branch splitting
		'element.querySelector(":scope :is(:where(.a, .b), .c)");',
		// Known limitation: the rule does not look inside `:not()`, so a nested `:scope` is accepted
		'element.querySelector(":not(:scope) .a");',
		// `:scope` is an ASCII case-insensitive pseudo-class
		'element.querySelector(":Scope .a, :SCOPE .b");',
		// `:scope` token recognized without surrounding whitespace
		'element.querySelector(":scope>.a");',
		// An unterminated comment is consumed to the end without crashing
		'element.querySelector(":scope a /* x");',
		'element.querySelector("");',
		'element.querySelector("   ");',
		'element.querySelector(selector);',
		'element.querySelector(".outer " + selector);',
		'element.querySelector(`.${className}`);', // eslint-disable-line no-template-curly-in-string
		'element.querySelector(String.raw`.outer .inner`);',
	],
	invalid: [
		'element.querySelector(".outer .inner");',
		'element.querySelectorAll(".outer .inner");',
		'element.querySelector(".a");',
		'document.body.querySelectorAll("option");',
		'element.querySelector(`.outer .inner`);',
		'element.querySelectorAll(`option`);',
		'element?.querySelector(".outer .inner");',
		'element.querySelector?.(".outer .inner");',
		'element.querySelectorAll(".foo, .bar");',
		// Only the first branch of the list is scoped
		'element.querySelector(":scope div .a, div b");',
		// Only the second branch of the list is scoped
		'element.querySelector(".a, :scope .b");',
		// Inner `:is()` comma is not a list separator, so this is a single selector and gets a suggestion
		'element.querySelector("div:is(a, b)");',
		// `:scope` inside an attribute-value string is not a real `:scope` token
		'element.querySelector("[data-value=\':scope\'] .inner");',
		// `:scope` inside a comment is not a real `:scope` token
		'element.querySelector("/* :scope */ .a");',
		// An escaped comma is part of an identifier, not a list separator
		String.raw`element.querySelector(".a\\, .b");`,
		// An escaped colon makes a class name, not a `:scope` pseudo-class
		String.raw`element.querySelector(".foo\\:scope a");`,
		// A comma inside an attribute-value string is not a list separator (single branch, so a suggestion is offered)
		'element.querySelector("[data-foo=\'a, b\'] .x");',
		// A real top-level comma splits even when another branch contains a string comma
		'element.querySelector(":scope a, [data-foo=\'x, y\'] b");',
		// A closing bracket inside an attribute-value string must not corrupt bracket-depth tracking
		'element.querySelector("[data-foo=\']\'] .a");',
		// `:scoped` is a different token and does not satisfy `:scope`
		'element.querySelector(":scoped .a");',
		// `::scope` is a pseudo-element and does not satisfy the `:scope` pseudo-class
		'element.querySelector("::scope .a");',
		// A no-expression template literal goes through the same per-branch logic
		'element.querySelectorAll(`:scope .a, div .b`);',
		// TypeScript non-null assertion on the call (the form used in the issue) is still reported
		{code: 'element.querySelector(".outer .inner")!;', languageOptions: {parser: parsers.typescript}},
	],
});
