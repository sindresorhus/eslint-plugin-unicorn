import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

// A module (file with exports) used as the base for invalid cases
const withExport = code => outdent`
	${code}
	export {};
`;

test.snapshot({
	valid: [
		// Files with hashbang are skipped entirely
		outdent`
			#!/usr/bin/env node
			foo();
		`,

		// Files with no exports are skipped (scripts, not modules)
		'foo();',
		'new Foo();',
		'console.log("hello");',

		// Declarations are allowed at top level
		withExport('const x = foo();'),
		withExport('let x = new Foo();'),
		withExport('var x = bar();'),
		withExport('function foo() {}'),
		withExport('class Foo {}'),

		// Assignment expressions are allowed
		withExport('module.exports = foo();'),
		withExport('exports.foo = bar();'),
		withExport('x = foo();'),

		// Import statements are fine
		outdent`
			import foo from 'foo';
			export default foo;
		`,

		// Export statements themselves are fine
		withExport('export const x = foo();'),

		// Directives are fine
		outdent`
			'use strict';
			export {};
		`,
	],
	invalid: [
		// Top-level function calls in a module
		withExport('foo();'),
		withExport('console.log("hello");'),
		withExport('foo.bar();'),
		withExport('foo?.();'),

		// Top-level new expressions
		withExport('new Foo();'),
		withExport('new foo.Bar();'),

		// Top-level IIFE
		withExport('(function() {})();'),
		withExport('(() => {})();'),

		// Tagged template literals
		withExport('html`<div></div>`;'),

		// Await wrapping a call/new
		withExport('await foo();'),
		withExport('await new Foo();'),

		// Multiple side effects
		outdent`
			foo();
			bar();
			export {};
		`,
	],
});
