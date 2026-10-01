import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typescriptCode = code => ({
	code,
	languageOptions: {parser: parsers.typescript},
});

const vueCode = code => ({
	code,
	languageOptions: {parser: parsers.vue},
});

const vueTypeScriptCode = code => ({
	code,
	languageOptions: {
		parser: parsers.vue,
		parserOptions: {
			parser: parsers.typescript.implementation,
		},
	},
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
		vueCode(outdent`
			<script setup>
				import {watch, watchEffect} from 'vue';

				watch(source, callback);
				watchEffect(callback);
				defineExpose({foo});
				defineOptions({inheritAttrs: false});
			</script>
		`),
		vueTypeScriptCode(outdent`
			<script>
				export default {
					inheritAttrs: false,
				};
			</script>
			<script setup lang="ts">
				import {watch, watchEffect} from 'vue';

				watch<string>(source, callback);
				watchEffect(callback);
				defineExpose({foo});
				defineOptions({inheritAttrs: false});
			</script>
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
		vueCode(outdent`
			<script>
				runSideEffectOnce();
				export default {};
			</script>
			<script setup>
				watch(source, callback);
			</script>
		`),
		vueCode(outdent`
			<script setup>
				watch(source, callback);
			</script>
			<script>
				runSideEffectOnce();
				export default {};
			</script>
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
		'export {}; void init();',
		'export {}; import("./setup.js");',
		'export {}; counter++;',
		'export {}; delete object.property;',
		'export {}; app?.init();',
		'export {}; app.init?.();',
		'export {}; tag`value`;',
		typescriptCode('export {}; (tag`value`) as string;'),
	],
});

// `export default init()` runs at module evaluation time just like a bare expression
test({
	valid: [
		'export default {};',
		'export default function () {};',
		'export default class {};',
		'const x = 1;\nexport default x;',
		// The assignment exception applies to a default-exported assignment too
		'export default value = init();',
		// A class declaration is a declaration, even with a side-effecting `extends`
		'export default class extends init() {}',
	],
	invalid: [
		...[
			'export default init();',
			'export default new App();',
			'export default (function () { init(); })();',
			'export default (class extends init() {});',
			'export default init`value`;',
		].map(code => ({code, errors: 1})),
	],
});
