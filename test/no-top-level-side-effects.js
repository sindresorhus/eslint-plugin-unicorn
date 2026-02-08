import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Variable declarations are fine
		outdent`
			export const foo = 'bar';
		`,
		// Variable declarations with function calls are fine (assignments)
		outdent`
			export const response = fetch('/api');
		`,
		outdent`
			export const memo = mem(fetch);
		`,
		outdent`
			const details = new Map();
			export default details;
		`,
		// Function/class declarations are fine
		outdent`
			export function init() {
				document.title = 'gone';
			}
		`,
		outdent`
			export class App {}
		`,
		// Side effects wrapped in exported functions are fine
		outdent`
			export function setup() {
				console.log('loaded');
				fetch('/api/init');
			}
		`,
		// Files with no exports are entry points — exempt
		'console.log("hello");',
		outdent`
			document.title = 'gone';
			fetch('/api/init');
		`,
		// Import statements are fine
		outdent`
			import foo from 'bar';
			export const x = foo;
		`,
		// 'use strict' directives are fine
		outdent`
			'use strict';
			export const x = 1;
		`,
		// Hashbang files are CLI scripts — exempt
		outdent`
			#!/usr/bin/env node
			console.log('hello');
			export const x = 1;
		`,
		// CJS exports are not side effects themselves
		outdent`
			module.exports = { foo: 'bar' };
		`,
		outdent`
			exports.foo = 'bar';
		`,
		// Type exports (TypeScript-style, but still valid ESM syntax)
		outdent`
			export default function() {}
		`,
		// Re-export
		outdent`
			export { foo } from 'bar';
		`,
		// Assignment to property of module-scoped variable
		outdent`
			const unicorn = {};
			unicorn.configs = { recommended: {} };
			export default unicorn;
		`,
		// Object.assign on a module-scoped class
		outdent`
			import {ReferenceTracker} from 'foo';
			class GlobalReferenceTracker {}
			Object.assign(GlobalReferenceTracker, { READ: ReferenceTracker.READ });
			export default GlobalReferenceTracker;
		`,
		// Object.freeze on a module-scoped variable
		outdent`
			const config = { key: 'value' };
			Object.freeze(config);
			export default config;
		`,
		// Object.defineProperty on a module-scoped variable
		outdent`
			class Foo {}
			Object.defineProperty(Foo, 'bar', { value: 1 });
			export default Foo;
		`,
	],
	invalid: [
		// Bare function call in a module with exports
		outdent`
			console.log('loaded');
			export const foo = 'bar';
		`,
		// Bare function call (fetch)
		outdent`
			fetch('/api/init');
			export default function app() {}
		`,
		// Assignment to global/non-local
		outdent`
			document.title = 'gone';
			export const x = 1;
		`,
		// Method call on global object
		outdent`
			Object.defineProperty(globalThis, 'foo', { value: 1 });
			export const x = 1;
		`,
		// Multiple side effects
		outdent`
			console.log('a');
			fetch('/api');
			export const x = 1;
		`,
		// IIFE in module
		outdent`
			(function() { console.log('init'); })();
			export const x = 1;
		`,
		// Side effect after export
		outdent`
			export const x = 1;
			console.log('after export');
		`,
	],
});
