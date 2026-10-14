import nodeTest from 'node:test';
import outdent from 'outdent';
import {Linter} from 'eslint';
import markdown from '@eslint/markdown';
import unicorn from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const withDefaultExportChecking = testCase => {
	if (typeof testCase === 'string') {
		testCase = {code: testCase};
	}

	return {...testCase, options: [{...testCase.options?.[0], checkDefaultExports: true}]};
};

const testDefaultExports = testCases => test({
	...testCases,
	valid: testCases.valid.map(testCase => withDefaultExportChecking(testCase)),
	invalid: testCases.invalid.map(testCase => withDefaultExportChecking(testCase)),
});

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

testDefaultExports({
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
		// Tagged templates inside objects are outside the argument analysis.
		'import {createElement} from "react"; export default createElement("div", {title: tag`value`});',
		'import {memo} from "react"; export default memo(/* Component */ Link);',
		'import {memo} from "react"; export default memo(class extends Component {});',
		'import {createRef} from "react"; export default createRef();',
		'import {memo} from "react"; export default [memo(Link)];',
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
			'import * as React from "react"; export default (class React extends React.memo(Link) {});',
			'import {memo as React} from "react"; export default React.memo(Link);',
			'export default React.memo(Link);',
			'function memo(value) { return value; } export default memo(Link);',
			'import {memo} from "react"; export default {Component: memo(Link)};',
			'import {memo} from "react"; export default memo({Component: initialize()});',
			// eslint-disable-next-line no-template-curly-in-string
			'import figma from "figma"; export default {example: figma.code`<Tag ${figma.helpers.react.renderProp("color", color)} />`};',
		].map(code => ({code, errors: 1})),
		{
			code: 'import {memo} from "react"; export default memo(Link);\ninit();',
			errors: [{
				messageId: 'no-top-level-side-effects', line: 2, column: 1, endLine: 2, endColumn: 8,
			}],
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

testDefaultExports({
	valid: [
		'import {defineComponent} from "vue"; export default defineComponent({setup() { initialize(); }});',
		'import {defineComponent as component} from "vue"; export {}; component({});',
		'import * as Vue from "vue"; export default Vue.defineComponent({});',
		'import {defineComponent} from "vue"; export default defineComponent(() => { initialize(); return () => null; });',
		'import {defineComponent} from "vue"; export default defineComponent(() => () => null, {name: "Component"});',
		typescriptCode('import {defineComponent} from "vue"; export default defineComponent<{title: string}>(() => () => null);'),
		vueCode('<script>import {defineComponent} from "vue"; export default defineComponent({setup() { initialize(); }});</script>'),
		vueTypeScriptCode('<script lang="ts">import {defineComponent} from "vue"; export default defineComponent({}) satisfies Component;</script>'),
	],
	invalid: [
		...[
			'import {defineComponent} from "vue"; export default defineComponent(loadOptions());',
			'import {defineComponent} from "vue"; export default defineComponent({setup: initialize()});',
			'import {defineComponent} from "vue"; export default defineComponent(() => () => null, {name: initialize()});',
			'import {defineComponent as component} from "vue"; export {}; component(loadOptions());',
			'import * as Vue from "vue"; export default Vue.defineComponent(loadOptions());',
			'import {defineComponent} from "other"; export default defineComponent({});',
			'import {createApp} from "vue"; export default createApp({});',
			'export default defineComponent({});',
		].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
		{
			...typescriptCode('import type {defineComponent} from "vue"; export default defineComponent({});'),
			errors: [{messageId: 'no-top-level-side-effects'}],
		},
		{
			...vueCode('<script>import {defineComponent} from "vue"; export default defineComponent({setup: initialize()});</script>'),
			errors: [{messageId: 'no-top-level-side-effects'}],
		},
		{
			code: 'import {defineComponent} from "vue"; export default defineComponent({});\ninit();',
			errors: [{messageId: 'no-top-level-side-effects', line: 2}],
		},
	],
});

for (const moduleName of ['eslint/config', '@eslint/config-helpers']) {
	test({
		valid: [
			`import {globalIgnores} from "${moduleName}"; export {}; [globalIgnores(["dist/"])];`,
		],
		invalid: [{
			code: `import {globalIgnores} from "${moduleName}"; export {}; [globalIgnores([initialize()])];`,
			errors: [{messageId: 'no-top-level-side-effects'}],
		}],
	});

	testDefaultExports({
		valid: [
			{
				code: `import {defineConfig} from "${moduleName}"; export default defineConfig([]);`,
				filename: 'eslint.config.js',
			},
			`import {defineConfig as configure} from "${moduleName}"; export {}; configure({rules: {}});`,
			`import * as configHelpers from "${moduleName}"; export default configHelpers.defineConfig([{rules: {}}]);`,
			typescriptCode(`import {defineConfig} from "${moduleName}"; export default defineConfig([]) satisfies Config[];`),
		],
		invalid: [
			...[
				`import {defineConfig} from "${moduleName}"; export default defineConfig(loadConfig());`,
				`import {defineConfig} from "${moduleName}"; export default defineConfig([loadConfig()]);`,
				`import {defineConfig} from "${moduleName}"; export {}; defineConfig({settings: {value: loadConfig()}});`,
				`import * as configHelpers from "${moduleName}"; export default configHelpers.defineConfig(loadConfig());`,
				`import {includeIgnoreFile} from "${moduleName}"; export default includeIgnoreFile(".gitignore");`,
				`import {defineConfig} from "${moduleName}"; const configure = defineConfig; export default configure([]);`,
			].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
			{
				...typescriptCode(`import type {defineConfig} from "${moduleName}"; export default defineConfig([]);`),
				errors: [{messageId: 'no-top-level-side-effects'}],
			},
		],
	});
}

testDefaultExports({
	valid: ['import configHelpers from "eslint/config"; export default configHelpers.defineConfig([]);'],
	invalid: [
		{
			code: 'import {defineConfig} from "other"; export default defineConfig([]);',
			errors: [{messageId: 'no-top-level-side-effects'}],
		},
		{
			code: 'export default defineConfig([]);',
			errors: [{messageId: 'no-top-level-side-effects'}],
		},
		{
			code: 'import {defineConfig} from "eslint/config"; export default defineConfig([]);\ninit();',
			filename: 'eslint.config.js',
			errors: [{messageId: 'no-top-level-side-effects', line: 2}],
		},
	],
});

for (const [moduleName, method] of [
	['vite', 'defineConfig'],
	['vitest/config', 'defineConfig'],
	['vitest/config', 'defineProject'],
	['rollup', 'defineConfig'],
	['astro/config', 'defineConfig'],
]) {
	testDefaultExports({
		valid: [
			`import {${method}} from "${moduleName}"; export default ${method}({});`,
			`import {${method} as configure} from "${moduleName}"; export {}; configure({});`,
			`import * as configHelpers from "${moduleName}"; export default configHelpers.${method}({});`,
			typescriptCode(`import {${method}} from "${moduleName}"; export default ${method}({}) satisfies Config;`),
		],
		invalid: [
			...[
				`import {${method}} from "${moduleName}"; export default ${method}(loadConfig());`,
				`import {${method}} from "${moduleName}"; export default ${method}({plugins: [initialize()]});`,
				`import {${method} as configure} from "${moduleName}"; export {}; configure(loadConfig());`,
				`import * as configHelpers from "${moduleName}"; export default configHelpers.${method}(loadConfig());`,
			].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
			{
				code: `import {${method}} from "${moduleName}"; export default ${method}({});\ninit();`,
				errors: [{messageId: 'no-top-level-side-effects', line: 2}],
			},
		],
	});
}

testDefaultExports({
	valid: [
		'import {defineConfig} from "vite"; export default defineConfig(() => ({plugins: [initialize()]}));',
		'import {defineConfig} from "vite"; export default defineConfig(async () => loadConfig());',
		'import {defineConfig} from "vite"; export default defineConfig(async () => new Promise(resolve => resolve(loadConfig())));',
	],
	invalid: [
		'import {defineConfig} from "vite"; export default defineConfig({[initialize()]: true});',
		'import {defineConfig} from "vite"; export default defineConfig({...loadConfig()});',
		'import {defineConfig} from "vite"; export default defineConfig(new Promise(resolve => resolve(loadConfig())));',
	].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
});

testDefaultExports({
	valid: [],
	invalid: [
		'import {defineProject} from "vite"; export default defineProject({});',
		'import {defineProject} from "other"; export default defineProject({});',
		'export default defineProject({});',
	].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
});

const defaultAllowOptions = [{allow: {'@company/wrapper': ['default']}}];

testDefaultExports({
	valid: [
		'import wrap from "@company/wrapper"; export default wrap(Component);',
		'import configure from "@company/wrapper"; export {}; configure({});',
		'import {default as wrap} from "@company/wrapper"; export default wrap(Component);',
		'import * as helpers from "@company/wrapper"; export default helpers.default(Component);',
		'import wrap from "@company/wrapper"; export default wrap(wrap(Component));',
		'import wrap from "@company/wrapper"; import {memo} from "react"; export default wrap(memo(Component));',
		typescriptCode('import wrap from "@company/wrapper"; export default wrap<Props>(Component) satisfies Component;'),
	].map(testCase => ({...(typeof testCase === 'string' ? {code: testCase} : testCase), options: defaultAllowOptions})),
	invalid: [
		...[
			'import wrap from "@company/wrapper"; export default wrap(initialize());',
			'import wrap from "@company/wrapper"; import {memo} from "react"; export default wrap(memo(initialize()));',
			'import wrap from "@company/wrapper"; export {}; wrap({value: initialize()});',
			'import wrap from "@company/other"; export default wrap(Component);',
			'import {wrap} from "@company/wrapper"; export default wrap(Component);',
			'import wrap from "@company/wrapper"; export default wrap?.(Component);',
			'import * as helpers from "@company/wrapper"; export default helpers(Component);',
		].map(code => ({code, options: defaultAllowOptions, errors: [{messageId: 'no-top-level-side-effects'}]})),
		{
			...typescriptCode('import type wrap from "@company/wrapper"; export default wrap(Component);'),
			options: defaultAllowOptions,
			errors: [{messageId: 'no-top-level-side-effects'}],
		},
	],
});

const allowOptions = [{allow: {'@company/config': ['defineConfig', 'wrap'], react: ['custom']}}];

nodeTest('validates the option schema', t => {
	const linter = new Linter();
	for (const options of [
		{allow: ['wrap']},
		{allow: {'@company/config': 'wrap'}},
		{allow: {'@company/config': [1]}},
		{checkDefaultExports: 'true'},
		{unknown: true},
	]) {
		t.assert.throws(() => linter.verify('export {};', {
			plugins: {unicorn},
			rules: {'unicorn/no-top-level-side-effects': ['error', options]},
		}), {message: /Key "rules"/v});
	}
});

testDefaultExports({
	valid: [
		'import {defineConfig} from "@company/config"; export default defineConfig({});',
		'import {defineConfig as configure} from "@company/config"; export {}; configure({});',
		'import * as config from "@company/config"; export default config.defineConfig({});',
		'import {defineConfig, wrap} from "@company/config"; export default wrap(defineConfig({}));',
		'import {defineConfig, wrap} from "@company/config"; export default [[wrap(defineConfig({}))]];',
		'import * as config from "@company/config"; const {wrap: configure} = config; export default configure({});',
		'import {wrap} from "@company/config"; export default wrap(() => initialize());',
		'import {memo} from "react"; export default memo(Component);',
		'import {custom} from "react"; export default custom(Component);',
		'import {defineConfig} from "vite"; export default defineConfig({});',
		typescriptCode('import {wrap} from "@company/config"; export default wrap<Props>(Component) satisfies Component;'),
	].map(testCase => ({...(typeof testCase === 'string' ? {code: testCase} : testCase), options: allowOptions})),
	invalid: [
		...[
			'import {defineConfig} from "@company/config"; export default defineConfig(initialize());',
			'import {defineConfig as configure} from "@company/config"; export {}; configure({value: initialize()});',
			'import * as config from "@company/config"; export default config.defineConfig(initialize());',
			'import {defineConfig, wrap} from "@company/config"; export default wrap(defineConfig(initialize()));',
			'import {other} from "@company/config"; export default other({});',
			'import {defineConfig} from "@company/other"; export default defineConfig({});',
			'import {defineConfig} from "@company/config/extra"; export default defineConfig({});',
			'import {wrap} from "@company/config"; const alias = wrap; export default alias(Component);',
			'import * as config from "@company/config"; export default config["defineConfig"]({});',
			'import {wrap} from "@company/config"; export default wrap?.(Component);',
			'import configure from "@company/config"; export default configure({});',
			'function wrap(value) { return value; } export default wrap(Component);',
			'export default defineConfig({});',
			'import {create} from "constructor"; export default create({});',
		].map(code => ({code, options: allowOptions, errors: [{messageId: 'no-top-level-side-effects'}]})),
		{
			...typescriptCode('import type {wrap} from "@company/config"; export default wrap(Component);'),
			options: allowOptions,
			errors: [{messageId: 'no-top-level-side-effects'}],
		},
		{
			code: 'import {defineConfig} from "@company/config"; export default defineConfig({});\ninit();',
			options: allowOptions,
			errors: [{messageId: 'no-top-level-side-effects', line: 2}],
		},
		{
			code: 'import {defineConfig as configure} from "@company/config"; export default configure({});',
			options: [{allow: {'@company/config': ['configure']}}],
			errors: [{messageId: 'no-top-level-side-effects'}],
		},
	],
});

testDefaultExports({
	valid: [
		{
			code: 'import {memo} from "react"; export default memo(Component);',
			options: [{allow: {react: []}}],
		},
		{
			code: 'import {create} from "constructor"; export default create({});',
			options: [{allow: {constructor: ['create']}}],
		},
	],
	invalid: [
		'import {defineConfig} from "@company/config"; export default defineConfig({});',
		'import wrap from "@company/wrapper"; export default wrap(Component);',
		'import {custom} from "react"; export default custom(Component);',
	].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
});

for (const [parser, filename] of [[undefined, 'component.jsx'], [parsers.typescript, 'component.tsx']]) {
	testDefaultExports({
		testerOptions: {
			languageOptions: {
				parser,
				parserOptions: {ecmaFeatures: {jsx: true}},
			},
		},
		valid: [
			'import {memo} from "react"; export default memo(() => <Link title={initialize()} />);',
			'import {cloneElement} from "react"; export default cloneElement(<Link />);',
		].map(code => ({code, filename})),
		invalid: [
			'import {createElement} from "react"; export default createElement("div", {}, <span>{initialize()}</span>);',
			'import {cloneElement} from "react"; export default cloneElement(<Link title={initialize()} />);',
		].map(code => ({code, filename, errors: [{messageId: 'no-top-level-side-effects'}]})),
	});
}

// `export default init()` runs at module evaluation time just like a bare expression
testDefaultExports({
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
			'export default counter++;',
		].map(code => ({code, errors: 1})),
	],
});

// Default-exported expressions are allowed unless explicitly checked.
test({
	valid: [
		'export default init();',
		'export default new App();',
		'export default counter++;',
		'export default {config: createConfig()};',
		'export default [globalIgnores(["dist/"])];',
		'import stylelint from "stylelint"; const {createPlugin} = stylelint; export default createPlugin("my/rule", rule);',
		'import stylistic from "@stylistic/eslint-plugin"; export default stylistic.configs.customize({jsx: false});',
		typescriptCode('export default createConfig() satisfies Config;'),
		{
			code: 'export default init();',
			options: [{checkDefaultExports: false}],
		},
		{
			code: 'import {wrap} from "@company/wrapper"; export {}; wrap({});',
			options: [{allow: {'@company/wrapper': ['wrap']}}],
		},
	],
	invalid: [
		{
			code: 'export default createConfig();\ninit();',
			filename: 'eslint.config.js',
			errors: [{messageId: 'no-top-level-side-effects', line: 2}],
		},
		{
			code: 'export default createConfig();\ninit();',
			options: [{checkDefaultExports: false}],
			errors: [{messageId: 'no-top-level-side-effects', line: 2}],
		},
		...[
			'export {}; dotenv.config();',
			'export {}; configureProcess();',
			'export {}; await initialize();',
			'export {}; counter++;',
		].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
	],
});

const memberPathOptions = [{allow: {'@stylistic/eslint-plugin': ['configs.customize'], '@company/config': ['config.builders.create'], '@company/named': ['builders.create']}}];

testDefaultExports({
	valid: [
		'import stylistic from "@stylistic/eslint-plugin"; export default stylistic.configs.customize({jsx: false});',
		'import {default as stylistic} from "@stylistic/eslint-plugin"; export default stylistic.configs.customize({jsx: false});',
		'import {"default" as stylistic} from "@stylistic/eslint-plugin"; export default stylistic.configs.customize({jsx: false});',
		'import * as helpers from "@company/config"; export default helpers.config.builders.create({});',
		'import {builders} from "@company/named"; export default builders.create({});',
		'import {builders as configuration} from "@company/named"; export {}; configuration.create({});',
		'import {builders as configuration} from "@company/named"; const {create: build} = configuration; export default build({});',
		typescriptCode('import stylistic from "@stylistic/eslint-plugin"; export default (stylistic as typeof stylistic).configs.customize({}) satisfies Config;'),
	].map(testCase => ({...(typeof testCase === 'string' ? {code: testCase} : testCase), options: memberPathOptions})),
	invalid: [
		'import stylistic from "@stylistic/eslint-plugin"; export default stylistic.configs.customize(initialize());',
		'import {default as stylistic} from "@stylistic/eslint-plugin"; export default stylistic.configs.customize(initialize());',
		'import stylistic from "@stylistic/eslint-plugin"; export default stylistic.configs.customize({value: initialize()});',
		'import stylistic from "@stylistic/eslint-plugin"; export default stylistic.configs.other({});',
		'import stylistic from "other"; export default stylistic.configs.customize({});',
		'import stylistic from "@stylistic/eslint-plugin"; export default stylistic["configs"].customize({});',
		'import stylistic from "@stylistic/eslint-plugin"; export default stylistic.configs.customize?.({});',
		'import stylistic from "@stylistic/eslint-plugin"; export default stylistic?.configs.customize({});',
		'import stylistic from "@stylistic/eslint-plugin"; const configuration = stylistic.configs; export default configuration.customize({});',
		'import {builders} from "@company/named"; export default builders.other({});',
		'import {builders} from "@company/named"; const {other} = builders; export default other({});',
		'export default stylistic.configs.customize({});',
		typescriptCode('import type stylistic from "@stylistic/eslint-plugin"; export default stylistic.configs.customize({});'),
	].map(testCase => ({...(typeof testCase === 'string' ? {code: testCase} : testCase), options: memberPathOptions, errors: [{messageId: 'no-top-level-side-effects'}]})),
});

testDefaultExports({
	valid: [],
	invalid: [{
		code: 'import {configure} from "@company/config"; export default configure({});',
		options: [{allow: {'*config*': ['*']}}],
		errors: [{messageId: 'no-top-level-side-effects'}],
	}],
});

for (const moduleName of ['eslint/config', '@eslint/config-helpers']) {
	testDefaultExports({
		valid: [
			`import {globalIgnores} from "${moduleName}"; export default globalIgnores(["dist/"]);`,
			`import {globalIgnores as ignore} from "${moduleName}"; export {}; ignore(["dist/"]);`,
			`import * as helpers from "${moduleName}"; export default helpers.globalIgnores(["dist/"]);`,
			`import {defineConfig, globalIgnores} from "${moduleName}"; export default defineConfig([globalIgnores(["dist/"])]);`,
			`import {globalIgnores} from "${moduleName}"; export default [, [globalIgnores(["dist/"])], ];`,
			typescriptCode(`import {globalIgnores} from "${moduleName}"; export default globalIgnores(["dist/"]) satisfies Config;`),
		],
		invalid: [
			`import {globalIgnores} from "${moduleName}"; export default globalIgnores([initialize()]);`,
			`import {defineConfig, includeIgnoreFile} from "${moduleName}"; export default defineConfig([includeIgnoreFile(".gitignore")]);`,
			`import {defineConfig} from "${moduleName}"; export default [...defineConfig([])];`,
			`import {globalIgnores} from "${moduleName}"; export default {...globalIgnores(["dist/"])};`,
			`import {globalIgnores} from "${moduleName}"; export default globalIgnores(["dist/"], initialize());`,
			`import {globalIgnores} from "${moduleName}"; export default globalIgnores?.(["dist/"]);`,
		].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
	});
}

testDefaultExports({
	valid: [
		'import {convertIgnorePatternToMinimatch} from "@eslint/config-helpers"; export default convertIgnorePatternToMinimatch("dist/");',
		'import {globalIgnores, convertIgnorePatternToMinimatch} from "@eslint/config-helpers"; export default globalIgnores([convertIgnorePatternToMinimatch("dist/")]);',
		'import stylelint from "stylelint"; export default stylelint.createPlugin("my/rule", rule);',
		'import {default as stylelint} from "stylelint"; export default stylelint.createPlugin("my/rule", rule);',
		'import stylelint from "stylelint"; const {createPlugin, utils} = stylelint; export default createPlugin("my/rule", rule);',
		'import {default as stylelint} from "stylelint"; const {createPlugin} = stylelint; export default createPlugin("my/rule", rule);',
		'import stylelint from "stylelint"; const {createPlugin: plugin} = stylelint; export default plugin("my/rule", rule);',
		typescriptCode('import stylelint from "stylelint"; const {createPlugin} = (stylelint as typeof stylelint); export default createPlugin("my/rule", rule) satisfies Plugin;'),
	],
	invalid: [
		'import {convertIgnorePatternToMinimatch} from "@eslint/config-helpers"; export default convertIgnorePatternToMinimatch(loadPattern());',
		'import {convertIgnorePatternToMinimatch} from "eslint/config"; export default convertIgnorePatternToMinimatch("dist/");',
		'import stylelint from "stylelint"; const {createPlugin} = stylelint; export default createPlugin("my/rule", initialize());',
		'import {default as stylelint} from "stylelint"; const {createPlugin} = stylelint; export default createPlugin("my/rule", initialize());',
		'import {default as stylelint} from "other"; export default stylelint.createPlugin("my/rule", rule);',
		'import stylelint from "other"; const {createPlugin} = stylelint; export default createPlugin("my/rule", rule);',
		'import stylelint from "stylelint"; let {createPlugin} = stylelint; createPlugin = initialize; export default createPlugin("my/rule", rule);',
		'import stylelint from "stylelint"; const {createPlugin = initialize} = stylelint; export default createPlugin("my/rule", rule);',
		'import stylelint from "stylelint"; const {["createPlugin"]: plugin} = stylelint; export default plugin("my/rule", rule);',
		'import stylelint from "stylelint"; const plugin = stylelint.createPlugin; export default plugin("my/rule", rule);',
		typescriptCode('import type stylelint from "stylelint"; const {createPlugin} = stylelint; export default createPlugin("my/rule", rule);'),
		typescriptCode('import {type default as stylelint} from "stylelint"; export default stylelint.createPlugin("my/rule", rule);'),
		'export default [tag`value`];',
		'import {globalIgnores} from "eslint/config"; export default [globalIgnores(["dist/"]), [initialize()]];',
	].map(testCase => ({...(typeof testCase === 'string' ? {code: testCase} : testCase), errors: [{messageId: 'no-top-level-side-effects'}]})),
});

nodeTest('checks Markdown JavaScript blocks independently', t => {
	const linter = new Linter();
	const configuration = [
		{
			files: ['**/*.md'],
			plugins: {markdown},
			processor: 'markdown/markdown',
		},
		{
			files: ['**/*.js'],
			plugins: {unicorn},
			rules: {'unicorn/no-top-level-side-effects': 'error'},
		},
	];
	const messages = linter.verify('```js\nexport {};\ninit();\n```', configuration, {filename: 'readme.md'});

	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].ruleId, 'unicorn/no-top-level-side-effects');
	t.assert.strictEqual(messages[0].messageId, 'no-top-level-side-effects');
	t.assert.strictEqual(messages[0].line, 3);
	t.assert.deepStrictEqual(linter.verify('```js\nexport {};\n```\n\n```js\ninit();\n```', configuration, {filename: 'readme.md'}), []);
});
