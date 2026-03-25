import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Variable declarations (assignments are allowed)
		outdent`
			export const foo = 'bar';
		`,
		outdent`
			export const details = new Map();
		`,
		outdent`
			export const response = fetch();
		`,
		outdent`
			const memoizedFetch = mem(fetch);
			export default memoizedFetch;
		`,
		// Function and class declarations
		outdent`
			export function init() {
				document.title = 'gone';
			}
		`,
		outdent`
			export class Foo {
				constructor() {
					this.bar = 'baz';
				}
			}
		`,
		// Import/export
		'import foo from "bar";',
		'export { foo } from "bar";',
		'export * from "bar";',
		'export default function() {}',
		'export default class {}',
		// Directives
		outdent`
			'use strict';
			export const foo = 1;
		`,
		// No exports — file is an entry point, all side effects allowed
		outdent`
			document.title = 'gone';
		`,
		outdent`
			console.log('hello');
		`,
		outdent`
			init();
		`,
		// Hashbang — file is a script
		outdent`
			#!/usr/bin/env node
			console.log('hello');
			export const foo = 1;
		`,
		// Side effects inside functions (not top-level)
		outdent`
			export function init() {
				console.log('hello');
				document.title = 'gone';
			}
		`,
		// Empty statement
		outdent`
			;
			export const foo = 1;
		`,
		// allowedCalls option
		{
			code: outdent`
				require('./polyfill');
				export const foo = 1;
			`,
			options: [{allowedCalls: ['require']}],
		},
		{
			code: outdent`
				console.log('debug');
				export const foo = 1;
			`,
			options: [{allowedCalls: ['console.log']}],
		},
	],
	invalid: [
		// Top-level function call
		outdent`
			console.log('hello');
			export const foo = 1;
		`,
		// Top-level assignment expression (not declaration)
		outdent`
			document.title = 'gone';
			export const foo = 1;
		`,
		// Top-level new expression (unassigned)
		outdent`
			new Foo();
			export const foo = 1;
		`,
		// Top-level if statement
		outdent`
			if (condition) {
				doSomething();
			}
			export const foo = 1;
		`,
		// Top-level for statement
		outdent`
			for (const item of items) {
				doSomething(item);
			}
			export const foo = 1;
		`,
		// Top-level try-catch
		outdent`
			try {
				doSomething();
			} catch {}
			export const foo = 1;
		`,
		// Top-level throw
		outdent`
			throw new Error('fail');
			export const foo = 1;
		`,
		// Top-level while
		outdent`
			while (true) {
				break;
			}
			export const foo = 1;
		`,
		// allowedCalls doesn't match
		{
			code: outdent`
				someOtherCall();
				export const foo = 1;
			`,
			options: [{allowedCalls: ['console.log']}],
		},
	],
});

test.typescript({
	valid: [
		// TypeScript type declarations are allowed
		outdent`
			export type Foo = string;
		`,
		outdent`
			export interface Bar {
				baz: string;
			}
		`,
		outdent`
			export enum Direction {
				Up,
				Down,
			}
		`,
	],
	invalid: [],
});
