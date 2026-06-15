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
		// Simple (single-compound) selectors don't need `:scope`
		'element.querySelector("a");',
		'element.querySelector(".a");',
		'document.body.querySelectorAll("option");',
		'element.querySelectorAll(`option`);',
		// A list of simple selectors doesn't need `:scope`
		'element.querySelector(".a, b");',
		'element.querySelectorAll(".foo, .bar");',
		// A simple branch is fine even when a combined branch is scoped
		'element.querySelector(".a, :scope .b");',
		'element.querySelector(":scope div .a, b");',
		// The comma is inside `:is()`, so this is a single simple compound selector
		'element.querySelector("div:is(a, b)");',
		// Combinators inside `:is()` are not top-level, so this counts as simple (documents the `:is()` limitation)
		'element.querySelector("div:is(.a, div b)");',
		// The universal selector alone is simple
		'element.querySelector("*");',
		// A long single compound selector has no combinator
		'element.querySelector("a.b#c[data-x]:hover");',
		// Whitespace inside an attribute-value string is not a descendant combinator
		'element.querySelector("[title=\'a b\']");',
		// `~` inside an attribute selector is the `~=` operator, not a sibling combinator
		'element.querySelector("[class~=\'a\']");',
		// `+` inside a functional pseudo-class is not a sibling combinator
		'element.querySelector("a:nth-child(2n + 1)");',
		// `>` inside `:has()` is a relative combinator, not a top-level one
		'element.querySelector("a:has(> b)");',
		// A combinator inside `:is()` does not make the whole selector combined
		'element.querySelector("a:is(b + c)");',
		// Surrounding whitespace alone does not make a selector combined
		'element.querySelector("  .a  ");',
		// A list of functional pseudo-class selectors, each a single compound, is simple
		'element.querySelector(":is(a, b), :where(c)");',
		// An escaped character is part of an identifier, not a descendant combinator (e.g. Tailwind class names)
		String.raw`element.querySelector(".md\\:flex");`,
		String.raw`element.querySelector(".text-\\[14px\\]");`,
		String.raw`element.querySelector(".a\\,.b");`,
		// An escaped combinator character is part of an identifier, not a child combinator
		String.raw`element.querySelector(".a\\>b");`,
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
		'element.querySelector(`.outer .inner`);',
		'element?.querySelector(".outer .inner");',
		'element.querySelector?.(".outer .inner");',
		// Child and sibling combinators are combined selectors too
		'element.querySelector("a > b");',
		'element.querySelector("a + b");',
		'element.querySelector("a ~ b");',
		// Combinators without surrounding whitespace are still detected
		'element.querySelector("a>b");',
		'element.querySelector("a+b");',
		'element.querySelector("a~b");',
		// A combinator after a stripped attribute group is still detected
		'element.querySelector("[data-foo] .inner");',
		// A descendant combinator after a `:has()` group is still detected
		'element.querySelector("a:has(b) .c");',
		// A newline between compound selectors is a descendant combinator
		String.raw`element.querySelectorAll("div\n.a");`,
		// A simple first branch does not excuse a combined, unscoped second branch
		'element.querySelector(".a, div .b");',
		// Every branch of the list is combined and unscoped
		'element.querySelectorAll(".a .b, .c .d");',
		// Three branches: simple, combined-and-scoped, combined-and-unscoped
		'element.querySelector("a, :scope b c, .d .e");',
		// Only the first branch of the list is scoped
		'element.querySelector(":scope div .a, div b");',
		// Inner `:is()` comma is not a list separator, so this is a single selector and gets a suggestion
		'element.querySelector("div:is(a, b) .x");',
		// `:scope` inside an attribute-value string is not a real `:scope` token
		'element.querySelector("[data-value=\':scope\'] .inner");',
		// `:scope` inside a comment is not a real `:scope` token
		'element.querySelector("/* :scope */ div .a");',
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
