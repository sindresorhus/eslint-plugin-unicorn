import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const errors = [
	{
		messageId: 'no-top-level-side-effects',
	},
];

test({
	valid: [
		'init();',
		'import "side-effect";',
		'#!/usr/bin/env node\nexport const value = init();',
		'export function init() { document.title = "gone"; }',
		'export const value = init();',
		'const value = init();\nexport {value};',
		'document.title = "gone";\nexport const value = 1;',
		'let index = 0;\nindex++;\nexport {index};',
		'{}\nexport const value = 1;',
		'import value from "module";\nexport {value};',
		'export {value} from "module";',
		'export * from "module";',
		outdent`
			{
				const value = init();
			}

			export const value = 1;
		`,
		outdent`
			function init() {
				document.title = "gone";
			}
			export {init};
		`,
		outdent`
			const init = () => {
				document.title = "gone";
			};
			export {init};
		`,
	],
	invalid: [
		'init();\nexport const value = 1;',
		'export {};\ninit();',
		'new Widget();\nexport const value = 1;',
		'await init();\nexport const value = 1;',
		'import "side-effect";\nexport const value = 1;',
		outdent`
			{
				init();
			}

			export const value = 1;
		`,
		outdent`
			if (enabled) {
				init();
			}

			export const value = 1;
		`,
		outdent`
			for (const item of items) {
				init(item);
			}

			export const value = 1;
		`,
	].map(code => ({code, errors})),
});
