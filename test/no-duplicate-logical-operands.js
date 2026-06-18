import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Different operands.
		'foo && bar',
		'foo || bar',

		// Non-adjacent duplicates are ignored.
		'foo && bar && foo',
		'foo && (foo && bar)',

		// Not logical AND/OR.
		'foo ?? foo',

		// Calls and other complex expressions can have side effects.
		'getValue() && getValue()',
		'getValue() || getValue()',
		'foo.bar() && foo.bar()',
		'foo + bar && foo + bar',
		'await foo && await foo',
		'foo++ && foo++',
		'(foo = bar) && (foo = bar)',

		// Computed keys with complex expressions can have side effects.
		'foo[bar()] && foo[bar()]',
		'foo[bar + baz] || foo[bar + baz]',

		// Optional chains are skipped.
		'foo?.bar && foo?.bar',
		'foo?.[bar] || foo?.[bar]',

		// Constants are handled by ESLint core `no-constant-binary-expression`.
		'true && true',
		'0 || 0',

		// Identifier reads inside `with` can trigger proxy traps or getters.
		{code: 'with (scope) {foo && foo;}', languageOptions: {sourceType: 'script'}},
	],
	invalid: [
		// Identifiers are autofixed.
		'foo && foo',
		'foo || foo',
		'foo && bar && bar',
		'foo || bar || bar',
		'(foo) && (foo)',
		'this && this',

		// Member expressions are suggestions because property reads can be observable.
		'foo.bar && foo.bar',
		'foo.bar || foo.bar',
		'foo.bar.baz && foo.bar.baz',
		'foo && bar.baz && bar.baz',
		'this.foo && this.foo',
		'class Foo {#foo; method() {return this.#foo && this.#foo;}}',
		'class Foo extends Bar {method() {return super.foo && super.foo;}}',
		'foo[bar] && foo[bar]',
		'foo["bar"] || foo.bar',

		// TypeScript wrappers around references are ignored for matching.
		{code: '(foo as boolean) && (foo as boolean)', languageOptions: {parser: parsers.typescript}},
		{code: '(foo as Foo) && (foo as Bar)', languageOptions: {parser: parsers.typescript}},
		{code: '(<boolean>foo) && (<boolean>foo)', languageOptions: {parser: parsers.typescript}},
		{code: 'foo! || foo!', languageOptions: {parser: parsers.typescript}},
		{code: 'foo! && foo', languageOptions: {parser: parsers.typescript}},
		{code: '(foo satisfies boolean) && (foo satisfies boolean)', languageOptions: {parser: parsers.typescript}},

		// Comments outside the retained left operand disable fixes and suggestions.
		'foo /* keep */ && foo',
		'foo && /* keep */ foo',
		'foo && bar /* keep */ && bar',
		'foo && (foo /* keep */)',

		// Comments inside the retained left operand are preserved.
		'(foo /* keep */) && foo',
	],
});
