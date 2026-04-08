import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			const x = fetch('url');
			export const a = 1;
		`,
		outdent`
			let x;
			export const a = 1;
		`,
		outdent`
			const details = new Map();
			export const a = 1;
		`,
		outdent`
			const memoized = mem(fetch);
			export const a = 1;
		`,


		outdent`
			function init() {}
			export const a = 1;
		`,
		outdent`
			class App {}
			export const a = 1;
		`,
		outdent`
			async function load() {}
			export const a = 1;
		`,

		outdent`
			import 'polyfill';
			export const a = 1;
		`,

		outdent`
			export const a = 1;
			export const b = 'string';
			export const c = foo();
		`,
		outdent`
			export default 42;
		`,
		outdent`
			export default 'hello';
		`,
		outdent`
			export default -1;
		`,
		outdent`
			export default typeof window;
		`,
		outdent`
			export default a + b;
		`,
		outdent`
			export default x ? 'a' : 'b';
		`,
		outdent`
			export default a || fallback;
		`,
		outdent`
			export default { key: 1, value: 'two' };
		`,
		outdent`
			export default [1, 2, 3];
		`,
		outdent`
			export default { offset: -1 };
		`,
		outdent`
			export default [1, 2, -3];
		`,
		outdent`
			export default function foo() {}
		`,
		outdent`
			export default class Foo {}
		`,

		outdent`
			'use strict';
			export const a = 1;
		`,

		outdent`
			module.exports = { foo: 1 };
		`,
		outdent`
			module.exports.foo = 1;
			module.exports.bar = 2;
		`,
		outdent`
			exports.foo = 1;
		`,
		outdent`
			const lib = require('./lib');
			module.exports = lib;
		`,

		outdent`
			let x = 0;
			x = computeValue();
			export { x };
		`,
		outdent`
			const config = {};
			config.enabled = true;
			export { config };
		`,
		outdent`
			const {config} = createConfig();
			config.enabled = true;
			export { config };
		`,

		outdent`
			/* @__PURE__ */ setup();
			export const a = 1;
		`,
		outdent`
			/* #__PURE__ */ setup();
			export const a = 1;
		`,
		outdent`
			export default /* @__PURE__ */ setup();
		`,
		outdent`
			export default /* #__PURE__ */ setup();
		`,

		outdent`
			/* @__NO_SIDE_EFFECTS__ */
			function createApp() { return {}; }
			const app = createApp();
			export { app };
		`,
		outdent`
			/* #__NO_SIDE_EFFECTS__ */
			function setup() { return {}; }
			export default setup();
		`,

		'foo();',
		'new Foo();',
		'document.title = "gone";',
		outdent`
			if (condition) {
				doSomething();
			}
		`,

		outdent`
			#!/usr/bin/env node
			foo();
		`,
		outdent`
			#!/usr/bin/env node
			foo();
			export const a = 1;
		`,
	],

	invalid: [
		outdent`
			foo();
			export const a = 1;
		`,
		outdent`
			console.log('loaded');
			export const a = 1;
		`,
		outdent`
			foo.bar();
			export const a = 1;
		`,

		outdent`
			new App();
			export const a = 1;
		`,
		outdent`
			new EventEmitter().emit('ready');
			export const a = 1;
		`,

		outdent`
			css\`body { margin: 0 }\`;
			export const a = 1;
		`,

		outdent`
			foo?.();
			export const a = 1;
		`,

		outdent`
			void foo();
			export const a = 1;
		`,

		outdent`
			foo(), bar();
			export const a = 1;
		`,

		outdent`
			condition && foo();
			export const a = 1;
		`,

		outdent`
			if (condition) {
				doSomething();
			}
			export const a = 1;
		`,
		outdent`
			for (const item of items) {
				process(item);
			}
			export const a = 1;
		`,
		outdent`
			while (true) {
				tick();
			}
			export const a = 1;
		`,
		outdent`
			try {
				connect();
			} catch {}
			export const a = 1;
		`,

		outdent`
			export default setup();
		`,
		outdent`
			export default new App();
		`,
		outdent`
			export default (console.log('x'), 1);
		`,
		outdent`
			export default { data: fetchData() };
		`,
		outdent`
			export default [setup(), teardown()];
		`,
		outdent`
			export default \`\${setup()}\`;
		`,
		outdent`
			export default object[setup()];
		`,
		// await in export default
		outdent`
			export default await fetch('url');
		`,

		outdent`
			import shared from 'x';
			shared.flag = true;
			export const a = 1;
		`,

		outdent`
			document.title = 'gone';
			export const a = 1;
		`,
		outdent`
			window.foo = 1;
			export const a = 1;
		`,
		outdent`
			module.id = 1;
			export const a = 1;
		`,
	],
});
