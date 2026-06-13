import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typescriptCode = code => ({
	code,
	languageOptions: {parser: parsers.typescript},
});

test.snapshot({
	valid: [
		'init();',
		'new App();',
		'import "./polyfill.js";',
		'export {};',
		'export const value = 1;',
		'export {}; const response = fetch();',
		'export {}; document.title = "gone";',
		typescriptCode('export {}; (document.title = "gone") as string;'),
		typescriptCode('export type Foo = string;'),
		typescriptCode('export interface Foo {}'),
		outdent`
			#!/usr/bin/env node
			export {};
			init();
		`,
		outdent`
			export {};

			function init() {
				document.title = 'gone';
			}
		`,
		outdent`
			export {};

			class App {
				static {
					init();
				}
			}
		`,
		outdent`
			export {};

			if (enabled) {
				init();
			}
		`,
	],
	invalid: [
		outdent`
			export {};
			init();
		`,
		'export {}; new App();',
		'export {}; await init();',
		'export {}; import("./setup.js");',
		'export {}; counter++;',
		'export {}; delete object.property;',
		'export {}; app?.init();',
		'export {}; app.init?.();',
		'export {}; tag`value`;',
	],
});
