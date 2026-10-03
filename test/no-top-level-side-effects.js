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

test({
	valid: [
		...[
			'memo',
			'forwardRef',
			'lazy',
			'createContext',
			'createRef',
			'createElement',
			'cloneElement',
			'isValidElement',
		].flatMap(method => [
			`import React from "react"; export default React.${method}(value);`,
			`import {${method}} from "react"; export {}; ${method}(value);`,
		]),
		'import * as React from "react"; export default React.memo(Link);',
		'import ReactLibrary from "react"; export default ReactLibrary.memo(Link);',
		'import * as ReactLibrary from "react"; export default ReactLibrary.forwardRef(Link);',
		'import {memo as wrap} from "react"; export default wrap(Link);',
		'import {"memo" as wrap} from "react"; export default wrap(Link);',
		'import {memo} from "react"; export default (memo)(Link);',
		'import React from "react"; export default (React).memo(Link);',
		'import React from "react"; export default React.memo(React.forwardRef(Link));',
		'import {memo, forwardRef} from "react"; export default memo(forwardRef(Link));',
		'import {memo} from "react"; export default memo(Link, (previous, next) => compare(previous, next));',
		'import {forwardRef} from "react"; export default forwardRef((properties, reference) => render(properties, reference));',
		'import {lazy} from "react"; export default lazy(() => import("./Component.js"));',
		'import {createElement} from "react"; export default createElement("div", {}, createElement("span"));',
		// Nested tagged templates are outside the argument analysis.
		'import {createElement} from "react"; export default createElement("div", {title: tag`value`});',
		'import {memo} from "react"; export default memo(/* Component */ Link);',
		'import {memo} from "react"; export default memo(class extends Component {});',
		'import {createRef} from "react"; export default createRef();',
		typescriptCode('import {memo} from "react"; export default memo!(Link);'),
		typescriptCode('import {memo} from "react"; export default (memo satisfies typeof memo)(Link);'),
		typescriptCode('import React from "react"; export default (React as typeof React).memo(Link);'),
		typescriptCode('import {memo} from "react"; export default (memo(Link) as Component);'),
		typescriptCode('import {memo} from "react"; export default (memo(Link) satisfies Component);'),
		typescriptCode('import {memo} from "react"; export default memo(Link)!;'),
		typescriptCode('import {memo} from "react"; export default <Component>memo(Link);'),
		typescriptCode('import {memo, forwardRef} from "react"; export default memo((forwardRef<Props>(Link) as Component));'),
		vueCode('<script>import {memo} from "react"; export default memo(Link);</script>'),
	],
	invalid: [
		...[
			'import React from "react"; export default React.memo(initialize());',
			'import {memo} from "react"; export default (enabled ? memo : initialize)(Link);',
			'import {memo} from "react"; export {}; (enabled && memo || initialize)(Link);',
			'import React from "react"; export default (enabled ? React : factory).memo(Link);',
			'import {memo} from "react"; let wrap = memo; wrap = initialize; export default wrap(Link);',
			'import React from "react"; let factory = React; factory = custom; export default factory.memo(Link);',
			'import {memo} from "react"; const wrap = memo; export default wrap(Link);',
			'import React from "react"; export default React["memo"](Link);',
			'import {memo} from "react"; export default memo?.(Link);',
			'import React from "react"; export default React?.memo(Link);',
			'import {memo} from "react"; export default memo(class { static field = initialize(); });',
			'import {memo} from "react"; export {}; memo(class { static { initialize(); } });',
			'import {memo} from "react"; export default memo(class { [initialize()]() {} });',
			'import {memo} from "react"; export default (initialize(), memo)(Link);',
			'import React from "react"; export default React[(initialize(), "memo")](Link);',
			'import {memo, forwardRef} from "react"; export default memo(forwardRef(initialize()));',
			'import {memo} from "react"; export {}; memo(initialize());',
			'import {memo} from "react"; export default memo(Link, initialize());',
			'import {memo} from "react"; export default memo(counter++);',
			'import {memo} from "react"; export default memo(Component = Link);',
			'import {memo} from "react"; export default memo(...initialize());',
			'import {memo} from "react"; export default memo(tag`value`);',
			'import React from "other"; export default React.memo(Link);',
			'import * as React from "other"; export default React.memo(Link);',
			'import {memo} from "other"; export default memo(Link);',
			'import {memo as wrap} from "other"; export default wrap(Link);',
			'import {createPortal} from "react-dom"; export default createPortal(element, container);',
			'import {useMemo} from "react"; export default useMemo(createComponent, []);',
			'import React from "react"; export default React.useMemo(createComponent, []);',
			'import React from "react"; export default React(Link);',
			'import * as React from "react"; export default React(Link);',
			'import {memo as React} from "react"; export default React.memo(Link);',
			'export default React.memo(Link);',
			'function memo(value) { return value; } export default memo(Link);',
			'import {memo} from "react"; export default {Component: memo(Link)};',
			'import {memo} from "react"; export default [memo(Link)];',
			'import {memo} from "react"; export default memo({Component: initialize()});',
			// eslint-disable-next-line no-template-curly-in-string
			'import figma from "figma"; export default {example: figma.code`<Tag ${figma.helpers.react.renderProp("color", color)} />`};',
		].map(code => ({code, errors: 1})),
		{
			code: 'import {memo} from "react"; export default memo(Link);\ninit();',
			errors: [{messageId: 'no-top-level-side-effects', line: 2, column: 1, endLine: 2, endColumn: 8}],
		},
		{
			...typescriptCode('import {memo} from "react"; export default (memo(initialize()) as Component);'),
			errors: 1,
		},
		{
			...typescriptCode('import {memo} from "react"; export default memo((class { static field = initialize(); }) as Component);'),
			errors: 1,
		},
		{
			...typescriptCode('import type {memo} from "react"; export default memo(Link);'),
			errors: 1,
		},
		{
			...typescriptCode('import {type memo} from "react"; export default memo(Link);'),
			errors: 1,
		},
		{
			...typescriptCode('import type React from "react"; export default React.memo(Link);'),
			errors: 1,
		},
	],
});

// `export default init()` runs at module evaluation time just like a bare expression
test({
	valid: [
		'export default {};',
		typescriptCode('import React from "react"; export default React.memo<Props>(Link);'),
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
