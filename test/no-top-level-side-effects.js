import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		'import "./polyfill.js";',
		'init();',
		'export {}; const response = fetch();',
		'export {}; document.title = "gone";',
		'#!/usr/bin/env node\nexport {};\ninit();',
		outdent`
			function init() {
				document.title = 'gone';
			}
		`,
		outdent`
			class App {
				static {
					document.title = 'gone';
				}
			}
		`,
	],
	invalid: [
		{
			code: outdent`
				export {};
				init();
			`,
			errors: [
				{
					messageId: 'no-top-level-side-effects',
				},
			],
		},
		{
			code: 'export {}; new App();',
			errors: [
				{
					messageId: 'no-top-level-side-effects',
				},
			],
		},
		{
			code: 'export {}; window.location.reload();',
			errors: [
				{
					messageId: 'no-top-level-side-effects',
				},
			],
		},
	],
});
