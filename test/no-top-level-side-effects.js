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
		'export {}; value;',
		'export {}; const response = fetch();',
		'export {}; document.title = "gone";',
		typescriptCode('export {}; (document.title = "gone") as string;'),
		typescriptCode('export {}; (document.title = "gone") satisfies string;'),
		typescriptCode('export {}; (document.title = "gone")!;'),
		typescriptCode('export type Foo = string;'),
		typescriptCode('export interface Foo {}'),
		typescriptCode(outdent`
			export type Foo = string;
			init();
		`),
		typescriptCode(outdent`
			export interface Foo {}
			init();
		`),
		typescriptCode(outdent`
			export default interface Foo {}
			init();
		`),
		typescriptCode(outdent`
			export type {Foo};
			init();
		`),
		typescriptCode(outdent`
			export {type Foo};
			init();
		`),
		typescriptCode(outdent`
			export {type Foo} from "./module.js";
			init();
		`),
		typescriptCode(outdent`
			export type * from "./module.js";
			init();
		`),
		typescriptCode(outdent`
			export declare const value: number;
			init();
		`),
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

			(class {
				field = init();
			});
		`,
		outdent`
			export {};

			(class {
				static {
					init();
				}
			});
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
		outdent`
			export default function init() {}
			init();
		`,
		outdent`
			const value = 1;
			export {value};
			init();
		`,
		outdent`
			export * from "./module.js";
			init();
		`,
		typescriptCode(outdent`
			export type Foo = string;
			export const value = 1;
			init();
		`),
		typescriptCode(outdent`
			export enum Enum {
				A,
			}
			init();
		`),
		typescriptCode(outdent`
			export {type Foo, bar};
			init();
		`),
		outdent`
			export {};

			(class extends init() {});
		`,
		'export {}; await init();',
		'export {}; import("./setup.js");',
		'export {}; counter++;',
		'export {}; delete object.property;',
		'export {}; app?.init();',
		'export {}; app.init?.();',
		'export {}; tag`value`;',
		typescriptCode('export {}; (tag`value`) as string;'),
	],
});
