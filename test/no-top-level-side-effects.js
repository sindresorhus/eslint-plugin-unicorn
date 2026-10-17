import nodeTest from 'node:test';
import outdent from 'outdent';
import {Linter} from 'eslint';
import * as espree from 'espree';
import markdown from '@eslint/markdown';
import unicorn from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const withUnknownCallChecking = testCase => {
	if (typeof testCase === 'string') {
		testCase = {code: testCase};
	}

	return {...testCase, options: [{...testCase.options?.[0], checkUnknownCalls: true}]};
};

const testUnknownCalls = testCases => test({
	...testCases,
	valid: testCases.valid.map(testCase => withUnknownCallChecking(testCase)),
	invalid: testCases.invalid.map(testCase => withUnknownCallChecking(testCase)),
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

const moduleCode = code => `export const exported = 1; ${code}`;
const globals = {
	window: 'readonly', document: 'readonly', process: 'writable', sharedState: 'writable',
};

const uncertainReflectSetCalls = [
	'Reflect.set(globalThis, "value", 1, {});',
	'Reflect.set({}, "value", 1, globalThis);',
	'Reflect.set(globalThis, "value", 1, undefined);',
	'Reflect.set(globalThis, "value", ...values);',
	'Reflect.set(globalThis, ...arguments_);',
];

// Unknown invocations, including default exports, are allowed unless explicitly checked.
test({
	valid: [
		'initialize();',
		'const result = initialize();',
		'export default initialize();',
		'if (ready) { initialize(); }',
		'new App();',
		'tag`value`;',
		'import("./feature.js");',
		'globalThis.makeLocal().value = 1;',
		'const alias = globalThis; alias.value = 1;',
		'const local = {}; local.value++; delete local.value; Object.freeze(local);',
		'Object.assign(local, {value: 1});',
		'const Object = {assign: initialize}; Object.assign(globalThis, {value: 1});',
		'Object[method](globalThis, {value: 1});',
		'Object.assign(...targets);',
		'Object.assign();',
		...uncertainReflectSetCalls,
	].map(code => moduleCode(code)),
	invalid: [
		'globalThis.value = 1;',
		'const result = (globalThis.value = 1);',
		'if (ready) { globalThis.value = 1; }',
		'initialize(globalThis.value = 1);',
	].map(code => ({code: moduleCode(code), errors: [{messageId: 'global-mutation'}]})),
});

for (const checkUnknownCalls of [false, true]) {
	test({
		testerOptions: {languageOptions: {globals}},
		valid: [
			'const local = {}; local.value = 1; local.value++; delete local.value;',
			'let counter = 0; counter++;',
			'const globalThis = {}; globalThis.value = 1;',
			'const window = {}; window.value = 1;',
			'import process from "node:process"; process.env.TZ = "UTC";',
			'import state from "state"; state.value = 1;',
			'function later(value = initialize()) { globalThis.value = 1; }',
			'const later = () => { globalThis.value = 1; };',
			'const object = {get value() { return initialize(); }, method() { globalThis.value = 1; }};',
			'class Example { value = initialize(); method() { globalThis.value = 1; } }',
			'class Outer { value = class Inner { static { globalThis.value = 1; } }; }',
			'/* @__PURE__ */ (() => { globalThis.value = 1; })();',
			'await ready;',
			'const {...local} = globalThis;',
		].map(code => ({code: moduleCode(code), options: [{checkUnknownCalls}]})),
		invalid: [
			'globalThis.value = 1;',
			'window.value ||= 1;',
			'document.title = "title";',
			'process.env.TZ = "UTC";',
			'sharedState = {};',
			'Array.prototype.custom = method;',
			'globalThis.counter++;',
			'delete globalThis.value;',
			'delete globalThis?.value;',
			'const value = (globalThis.value = 1);',
			'export default (globalThis.value = 1);',
			'if (ready) { globalThis.value = 1; }',
			'for (let index = 0; index < 1; index++) { globalThis.value = index; }',
			'for (globalThis.value of values) {}',
			'for (globalThis.key in object) {}',
			'for ({value: globalThis.value} of values) {}',
			'class Example { static value = (globalThis.value = 1); }',
			'class Example { static { globalThis.value = 1; } }',
			'class Outer { static value = class Inner { static { globalThis.value = 1; } }; }',
			'class Example { [globalThis.key = "key"]() {} }',
			'class Example { [globalThis.key = "key"] = deferred(); }',
			'({value: globalThis.value} = input);',
			'[globalThis.value] = input;',
			'[...globalThis.values] = input;',
			'({...globalThis.values} = input);',
			'/* @__PURE__ */ wrap(globalThis.value = 1);',
			'/* @__PURE__ */ factory(globalThis.value = 1)();',
			'import {memo} from "react"; memo(globalThis.value = 1);',
			'Object.assign(globalThis, {value: 1});',
			'Object["defineProperty"](Array.prototype, "custom", {value: method});',
			'Object.defineProperties(globalThis, {value: {value: 1}});',
			'Object.freeze(globalThis);',
			'Object.seal(globalThis);',
			'Object.preventExtensions(globalThis);',
			'Object.setPrototypeOf(globalThis, prototype);',
			'Reflect.defineProperty(globalThis, "value", {value: 1});',
			'Reflect.deleteProperty(globalThis, "value");',
			'Reflect["set"](globalThis, "value", 1);',
			'Reflect?.["set"]?.(globalThis, "value", 1);',
			'Reflect.preventExtensions(globalThis);',
			'Reflect.setPrototypeOf(globalThis, prototype);',
			'/* @__PURE__ */ Object.assign(globalThis, {value: 1});',
		].map(code => ({code: moduleCode(code), options: [{checkUnknownCalls}], errors: [{messageId: 'global-mutation'}]})),
	});

	test({
		valid: [
			'globalThis.value = 1;',
			'export {}; globalThis.value = 1;',
			'#!/usr/bin/env node\nexport const value = 1; globalThis.value = 1;',
			typescriptCode('interface Foo {} export {Foo}; globalThis.value = 1;'),
			typescriptCode('type Foo = string; export {Foo as default}; globalThis.value = 1;'),
			typescriptCode('interface Foo {} export default Foo; globalThis.value = 1;'),
			typescriptCode('export type Foo = string; globalThis.value = 1;'),
			typescriptCode('export declare const value: number; globalThis.value = 1;'),
			typescriptCode('import type {Options} from "./options.js"; export {Options}; globalThis.value = 1;'),
			typescriptCode('import {type Options as Config} from "./options.js"; export {Config}; globalThis.value = 1;'),
			typescriptCode('import type Options from "./options.js"; export default Options; globalThis.value = 1;'),
			typescriptCode('import type * as Options from "./options.js"; export {Options as default}; globalThis.value = 1;'),
			vueCode('<script>export default {};</script><script setup>globalThis.value = 1; initialize();</script>'),
			{code: '<script module>export const value = 1; globalThis.value = 1;</script><script>initialize();</script>', filename: 'component.svelte', languageOptions: {parser: parsers.svelte}},
		].map(testCase => ({...(typeof testCase === 'string' ? {code: testCase} : testCase), options: [{checkUnknownCalls}]})),
		invalid: [
			typescriptCode('interface Foo {} export {Foo}; export const value = 1; globalThis.value = 1;'),
			typescriptCode('interface Foo {} class Foo {} export {Foo}; globalThis.value = 1;'),
			typescriptCode('import {type Options, value} from "./options.js"; export {Options, value}; globalThis.value = 1;'),
			typescriptCode('export enum Enum {A} globalThis.value = 1;'),
			typescriptCode('export const value = 1; (globalThis as typeof globalThis).value = 1;'),
			typescriptCode('export const value = 1; class Example { static value: number = (globalThis.value = 1); }'),
			{code: 'export {} from "./module.js"; globalThis.value = 1;'},
			vueCode('<script>export default {}; globalThis.value = 1;</script><script setup>initialize();</script>'),
		].map(testCase => ({...testCase, options: [{checkUnknownCalls}], errors: [{messageId: 'global-mutation'}]})),
	});

	for (const [filename, parserOptions] of [
		['state.svelte.js', {}],
		['state.svelte.ts', {parser: parsers.typescript.implementation}],
	]) {
		test({
			testerOptions: {languageOptions: {parser: parsers.svelte, parserOptions}},
			valid: [
				'export function update() { globalThis.value = 1; }',
				...(filename.endsWith('.ts') ? ['export interface Options {value: number} globalThis.value = 1;'] : []),
			].map(code => ({code, filename, options: [{checkUnknownCalls}]})),
			invalid: [{
				code: filename.endsWith('.ts') ? 'export const value: number = 1; globalThis.value = 1;' : 'export const value = 1; globalThis.value = 1;',
				filename,
				options: [{checkUnknownCalls}],
				errors: [{messageId: 'global-mutation'}],
			}],
		});
	}
}

testUnknownCalls({
	valid: [],
	invalid: uncertainReflectSetCalls.map(code => ({code: moduleCode(code), errors: [{messageId: 'no-top-level-side-effects'}]})),
});

nodeTest('suppressing nested diagnostics does not report their outer invocation', t => {
	const linter = new Linter();
	for (const [checkUnknownCalls, operation] of [
		[false, 'globalThis.value = 1'],
		[true, 'globalThis.value = 1'],
		[true, 'initialize()'],
	]) {
		const code = outdent`
			export const value = 1;
			outer(
				// eslint-disable-next-line unicorn/no-top-level-side-effects -- Intentional initialization.
				${operation}
			);
		`;
		const messages = linter.verify(code, {
			plugins: {unicorn},
			linterOptions: {reportUnusedDisableDirectives: 'error'},
			rules: {'unicorn/no-top-level-side-effects': ['error', {checkUnknownCalls}]},
		});
		t.assert.deepStrictEqual(messages, []);
	}
});

testUnknownCalls({
	valid: [
		'import {memo} from "react"; export default {...memo(Component)};',
		'import {memo} from "react"; export default memo(counter++);',
		'import {memo} from "react"; export default memo(Component = Link);',
		'import {memo} from "react"; export default memo(Component).displayName;',
		'/* @__PURE__ */ factory(initialize())(Component); export const value = 1;',
	],
	invalid: [
		'initialize();',
		'const result = initialize();',
		'if (ready) { initialize(); }',
		'class Example extends initialize() {}',
		'class Example { static value = initialize(); }',
		'class Example { static { initialize(); } }',
		'class Example { [initialize()] = deferred(); }',
		'const {value = initialize()} = input;',
		'const value = /* @__PURE__ */ wrap(initialize());',
		'outer(inner());',
	].map(code => ({code: moduleCode(code), errors: [{messageId: 'no-top-level-side-effects'}]})),
});

test.snapshot({
	valid: [],
	invalid: [
		'export const value = 1; globalThis.application = application;',
		'export const value = 1; const result = (globalThis.counter++);',
		'export const value = 1; Object.assign(globalThis, {application});',
		'export const value = 1; if (ready) { delete globalThis.application; }',
		typescriptCode('export const value = 1; (document.title = "title") satisfies string;'),
	],
});

testUnknownCalls({
	valid: [],
	invalid: [
		'for (globalThis.value of values) { initialize(); }',
		'for (globalThis.value of getValues()) {}',
	].map(code => ({code: moduleCode(code), errors: [{messageId: 'global-mutation'}, {messageId: 'no-top-level-side-effects'}]})),
});

test({
	valid: [
		'export {}; initialize();',
		'export {}; export {}; new App();',
		typescriptCode('export {}; export type Foo = string; initialize();'),
		'export default initialize();',
		'export default new App();',
		'export default {handler: initialize()};',
		{code: 'export default initialize();', options: [{checkUnknownCalls: false}]},
		'export {}; export const value = 1; initialize();',
		'export {} from "./module.js"; initialize();',
		'export default initialize(); initialize();',
	],
	invalid: [],
});

testUnknownCalls({
	valid: [
		'import {memo} from "react"; export default {Component: memo(Component)};',
		'import {memo} from "react"; export default [{Component: memo(Component)}, [memo(Other)]];',
		'import {memo} from "react"; export default enabled ? memo(A) : memo(B);',
		'import {memo} from "react"; export default enabled && memo(Component);',
		'import {memo} from "react"; export default existing || memo(Component);',
		'import {memo} from "react"; export default existing ?? memo(Component);',
		'import {memo, createElement} from "react"; export default createElement("div", {Component: memo(Component)});',
		'import {memo} from "react"; export default {[name]: memo(Component), get value() { return initialize(); }, method() { initialize(); }};',
		'export default {handler: /* @__PURE__ */ createHandler()};',
		'export default enabled && /* @__PURE__ */ createHandler();',
		'export default [/* @__PURE__ */ new Wrapper()];',
		typescriptCode('import {memo} from "react"; export default ({Component: memo!(Component)} satisfies Components);'),
	],
	invalid: [
		'import {memo} from "react"; export default {Component: memo(initialize())};',
		'import {memo} from "react"; export default {[initialize()]: memo(Component)};',
		'import {memo} from "react"; export default enabled ? memo(A) : initialize();',
		'import {memo} from "react"; export default initialize() && memo(Component);',
		'import {memo} from "react"; export default existing ?? memo(initialize());',
		'import {memo} from "react"; export default [{Component: memo(Component)}, {value: initialize()}];',
		'export default {handler: /* @__PURE__ */ createHandler(initialize())};',
		'export default {...initialize()};',
		'export default [...initialize()];',
	].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
});

testUnknownCalls({
	valid: [
		'import React from "react"; export default React["memo"](Component);',
		'import {memo} from "react"; export default memo?.(Component);',
		'import React from "react"; export default React?.memo(Component);',
		'import React from "react"; export default React.memo?.(Component);',
		'import React from "react"; export default React?.["memo"]?.(Component);',
		typescriptCode('import React from "react"; export default (React as typeof React)?.["memo"]<Props>(Component);'),
		{code: 'import * as config from "@company/config"; export default config["defineConfig"]({});', options: [{allow: {'@company/config': ['defineConfig']}}]},
	],
	invalid: [
		'import React from "react"; export default React[method](Component);',
		'import React from "react"; export default React[`memo`](Component);',
		'import React from "react"; export default React["memo"](initialize());',
		'import {memo} from "react"; export default memo?.(initialize());',
		'import React from "react"; export default React?.[initialize()](Component);',
		'import React from "other"; export default React?.["memo"]?.(Component);',
		'export default initialize?.();',
	].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
});

for (const moduleName of ['lodash', 'lodash-es']) {
	for (const method of ['debounce', 'throttle', 'memoize', 'once']) {
		for (const extension of ['', '.js']) {
			testUnknownCalls({
				valid: [`import wrap from "${moduleName}/${method}${extension}"; export default wrap(callback);`],
				invalid: [`import wrap from "${moduleName}/${method}${extension}"; export default wrap(initialize());`].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
			});
		}
	}
}

testUnknownCalls({
	valid: [],
	invalid: [
		'import delay from "lodash/delay.js"; export default delay(callback, 100);',
		'import wrap from "other/debounce.js"; export default wrap(callback);',
		'import wrap from "lodash/debounce/extra"; export default wrap(callback);',
	].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
});

nodeTest('keeps the rule in recommended and out of unopinionated', t => {
	t.assert.strictEqual(unicorn.configs.recommended.rules['unicorn/no-top-level-side-effects'], 'error');
	t.assert.strictEqual(unicorn.configs.unopinionated.rules['unicorn/no-top-level-side-effects'], 'off');
});

nodeTest('component parser contexts stay outside module evaluation', t => {
	const code = moduleCode('globalThis.value = 1;');
	const linter = new Linter();
	for (const checkUnknownCalls of [false, true]) {
		for (const services of [{isAstro: true}, {isSvelte: true}, {isSvelteScript: true}, {}]) {
			const parser = {
				parseForESLint: (code, options) => ({ast: espree.parse(code, options), services}),
			};
			const messages = linter.verify(code, {
				languageOptions: {parser},
				plugins: {unicorn},
				rules: {'unicorn/no-top-level-side-effects': ['error', {checkUnknownCalls}]},
			});
			t.assert.strictEqual(messages.length, services.isAstro || services.isSvelte ? 0 : 1);
		}
	}
});

nodeTest('only configured globals establish ambient mutation targets', t => {
	const code = moduleCode('process.env.TZ = "UTC";');
	const linter = new Linter();
	for (const checkUnknownCalls of [false, true]) {
		for (const globals of [{}, {process: 'readonly'}]) {
			const messages = linter.verify(code, {
				languageOptions: {globals},
				plugins: {unicorn},
				rules: {'unicorn/no-top-level-side-effects': ['error', {checkUnknownCalls}]},
			});
			t.assert.strictEqual(messages.length, globals.process ? 1 : 0);
		}
	}
});

for (const checkUnknownCalls of [false, true]) {
	test({
		testerOptions: {languageOptions: {parser: parsers.typescript, globals: {process: 'readonly'}}},
		valid: [
			'interface unconfiguredState {} unconfiguredState.value = 1;',
			'interface globalThis {} const globalThis = {}; globalThis.value = 1;',
			'const globalThis = {}; { type globalThis = {}; globalThis.value = 1; }',
		].map(code => ({code: moduleCode(code), options: [{checkUnknownCalls}]})),
		invalid: [
			'type globalThis = {}; globalThis.value = 1;',
			'interface Array<T> {} Array.prototype.value = 1;',
			'interface Object {} Object.assign(globalThis, {value: 1});',
			'interface Reflect {} Reflect.set(globalThis, "value", 1);',
			'interface process {} process.value = 1;',
		].map(code => ({code: moduleCode(code), options: [{checkUnknownCalls}], errors: [{messageId: 'global-mutation'}]})),
	});
}

nodeTest('highlights the operation that may have side effects', t => {
	const linter = new Linter();
	for (const code of [
		'import {memo} from "react"; export default memo(initialize());',
		'import {memo} from "react"; export default {Component: memo(initialize())};',
		'import {memo} from "react"; export default enabled ? memo(Component) : initialize();',
		'import {memo} from "react"; export const value = 1; memo(initialize());',
		'import * as helpers from "p-debounce"; export default helpers.default.promise(initialize());',
	]) {
		const messages = linter.verify(code, {plugins: {unicorn}, rules: {'unicorn/no-top-level-side-effects': ['error', {checkUnknownCalls: true}]}});
		t.assert.strictEqual(messages.length, 1);
		const [message] = messages;
		t.assert.strictEqual(code.slice(message.column - 1, message.endColumn - 1), 'initialize()');
		t.assert.strictEqual(message.message, 'This invocation may cause side effects when the module is imported.');
	}
});

for (const moduleName of ['memoize', 'debounce']) {
	testUnknownCalls({
		valid: [
			`import wrap from "${moduleName}"; export default wrap(() => initialize());`,
			`import wrap from "${moduleName}"; export const exported = 1; wrap(callback);`,
			`import * as helpers from "${moduleName}"; export default helpers.default(callback);`,
			typescriptCode(`import wrap from "${moduleName}"; export default wrap((event: Event) => handle(event)) satisfies Handler;`),
		],
		invalid: [
			`import wrap from "${moduleName}"; export default wrap(initialize());`,
			`import wrap from "${moduleName}"; export default wrap(callback, initialize());`,
			`import {other} from "${moduleName}"; export default other(callback);`,
			`import wrap from "${moduleName}"; export default wrap.other(callback);`,
			`import wrap from "${moduleName}"; export default new wrap(callback);`,
			typescriptCode(`import type wrap from "${moduleName}"; export default wrap(callback);`),
		].map(testCase => ({...(typeof testCase === 'string' ? {code: testCase} : testCase), errors: [{messageId: 'no-top-level-side-effects'}]})),
	});
}

for (const [moduleName, arguments_] of [
	['onetime', 'callback'],
	['p-memoize', 'callback'],
	['p-debounce', 'callback, 100'],
	['throttleit', 'callback, 100'],
	['p-limit', '2'],
]) {
	testUnknownCalls({
		valid: [
			`import wrap from "${moduleName}"; export default wrap(${arguments_});`,
			`import wrap from "${moduleName}"; export const exported = 1; wrap(${arguments_});`,
			`import {default as wrap} from "${moduleName}"; export default wrap(${arguments_});`,
			`import * as helpers from "${moduleName}"; export default helpers.default(${arguments_});`,
			typescriptCode(`import wrap from "${moduleName}"; export default (wrap(${arguments_}) satisfies Wrapper);`),
		],
		invalid: [
			`import wrap from "${moduleName}"; export default wrap(initialize());`,
			`import wrap from "${moduleName}"; export default wrap(${arguments_}, initialize());`,
			`import {other} from "${moduleName}"; export default other(${arguments_});`,
			`import wrap from "${moduleName}"; export default wrap.other(${arguments_});`,
			`import wrap from "${moduleName}"; export default new wrap(${arguments_});`,
			typescriptCode(`import type wrap from "${moduleName}"; export default wrap(${arguments_});`),
		].map(testCase => ({...(typeof testCase === 'string' ? {code: testCase} : testCase), errors: [{messageId: 'no-top-level-side-effects'}]})),
	});
}

testUnknownCalls({
	valid: [
		'import pDebounce from "p-debounce"; export default pDebounce.promise(() => initialize());',
		'import * as helpers from "p-debounce"; export default helpers.default.promise(callback);',
		'import {default as pDebounce} from "p-debounce"; export default pDebounce.promise(callback);',
		'import pDebounce from "p-debounce"; export const exported = 1; pDebounce.promise(callback, {after: true});',
		'import {limitFunction} from "p-limit"; export default limitFunction(() => initialize(), {concurrency: 2});',
		'import {limitFunction as wrap} from "p-limit"; export const exported = 1; wrap(callback, {concurrency: 2});',
		'import * as helpers from "p-limit"; export default helpers.limitFunction(callback, {concurrency: 2});',
	],
	invalid: [
		'import pDebounce from "p-debounce"; export default pDebounce.promise(initialize());',
		'import * as helpers from "p-debounce"; export default helpers.default.promise(initialize());',
		'import {default as pDebounce} from "p-debounce"; export default pDebounce.promise(initialize());',
		'import {other as pDebounce} from "p-debounce"; export default pDebounce.promise(callback);',
		'import pDebounce from "p-debounce"; export default pDebounce.promise(callback, {after: initialize()});',
		'import {limitFunction} from "p-limit"; export default limitFunction(initialize(), {concurrency: 2});',
		'import {limitFunction} from "p-limit"; export default limitFunction(callback, {concurrency: initialize()});',
		'import {limitFunction} from "other"; export default limitFunction(callback, {concurrency: 2});',
		'import pDebounce from "other"; export default pDebounce.promise(callback);',
		'import {pMemoizeClear} from "p-memoize"; export const exported = 1; pMemoizeClear(callback);',
	].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
});

for (const method of ['promisify', 'callbackify']) {
	testUnknownCalls({
		valid: [
			`import {${method}} from "node:util"; export default ${method}(callback);`,
			`import {${method} as wrap} from "node:util"; export const exported = 1; wrap(callback);`,
			`import * as utilities from "node:util"; export default utilities.${method}(callback);`,
			`import utilities from "node:util"; export default utilities.${method}(callback);`,
			`import {default as utilities} from "node:util"; export default utilities.${method}(callback);`,
		],
		invalid: [
			`import {${method}} from "node:util"; export default ${method}(initialize());`,
			`import {${method}} from "other"; export default ${method}(callback);`,
		].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
	});
}

testUnknownCalls({
	valid: [],
	invalid: [
		'import {inspect} from "node:util"; export const exported = 1; inspect(callback);',
		'import {deprecate} from "node:util"; export default deprecate(callback, "message");',
	].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
});

for (const moduleName of ['lodash', 'lodash-es']) {
	for (const method of ['debounce', 'throttle', 'memoize', 'once']) {
		testUnknownCalls({
			valid: [
				`import {${method}} from "${moduleName}"; export default ${method}(() => initialize());`,
				`import {${method} as wrap} from "${moduleName}"; export const exported = 1; wrap(callback);`,
				`import * as helpers from "${moduleName}"; export default helpers.${method}(callback);`,
				`import helpers from "${moduleName}"; export default helpers.${method}(callback);`,
			],
			invalid: [
				`import {${method}} from "${moduleName}"; export default ${method}(initialize());`,
				`import {${method}} from "${moduleName}"; export default ${method}(callback, initialize());`,
			].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
		});
	}

	testUnknownCalls({
		valid: [],
		invalid: [
			`import {delay} from "${moduleName}"; export const exported = 1; delay(callback, 100);`,
			`import {defer} from "${moduleName}"; export const exported = 1; defer(callback);`,
			`import helpers from "${moduleName}"; export const exported = 1; helpers.mixin({});`,
		].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
	});
}

testUnknownCalls({
	valid: [],
	invalid: [
		'import memoize from "other"; export default memoize(callback);',
		'import debounce from "other"; export default debounce(callback);',
		'export default memoize(callback);',
		'export default debounce(callback);',
	].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
});

for (const annotation of ['@__PURE__', '#__PURE__']) {
	testUnknownCalls({
		valid: [
			`export default /* ${annotation} */ wrap(callback, counter++);`,
			`export const exported = 1; /* ${annotation} */ counter++;`,
			`export default /* ${annotation} */ createFactory()(callback);`,
			`export default /* ${annotation} */ createFactory().wrap(callback);`,
			`export default /* ${annotation} */ helpers[initialize()](callback);`,
			`export default /* ${annotation} Creates a wrapper. */ createFactory()(callback);`,
			`export default /* ${annotation} */ wrap(() => initialize());`,
			`export const exported = 1; /* ${annotation} */ wrap(callback);`,
			`export default /* ${annotation} */ new Wrapper(callback);`,
			`export default /* ${annotation} */ (wrap(callback));`,
			`export default (/* ${annotation} */ wrap(callback));`,
			`export default /* ${annotation} */ /* explanation */ wrap(callback);`,
			`export default /* ${annotation} Creates a wrapper. */ wrap(callback);`,
			`export const exported = 1; /* Creates a wrapper. ${annotation} */ wrap(callback);`,
			`export default /* ${annotation}\nCreates a wrapper. */ new Wrapper(callback);`,
			`export default /* ${annotation} Creates a wrapper. */ (wrap(callback));`,
			`export default /* ${annotation} */ wrap(/* ${annotation} */ createHandler());`,
			`import memoize from "memoize"; export default memoize(/* ${annotation} */ createHandler());`,
			typescriptCode(`export default /* ${annotation} */ wrap<Handler>(() => initialize()) satisfies Handler;`),
		],
		invalid: [
			`export default /* ${annotation} */ wrap(initialize());`,
			`export default /* ${annotation} Creates a wrapper. */ wrap(initialize());`,
			`export default /* ${annotation} Creates a wrapper. */ new Wrapper(initialize());`,
			`export default /* ${annotation} Creates a wrapper. */ (initialize() ? A : B);`,
			`export default /* ${annotation} Creates a wrapper. */ (initialize() && A);`,
			`export default /* ${annotation} */ new Wrapper(initialize());`,
			`export default /* ${annotation} */ wrap(...initialize());`,
			`export default /* ${annotation} */ wrap({value: initialize()});`,
			`export default /* ${annotation} */ (initialize() ? A : B);`,
			`export default /* ${annotation} */ (initialize() && A);`,
			`export const exported = 1; /* ${annotation} */ other; wrap(callback);`,
			`export default wrap(/* ${annotation} */ callback);`,
			`export default /* ${annotation} */ tag\`value\`;`,
		].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
	});

	testUnknownCalls({
		valid: [
			`export default /* ${annotation} */ (wrap(callback) as Handler);`,
			`export default (/* ${annotation} */ wrap(callback)) as Handler;`,
			`export default (<Handler>/* ${annotation} */ wrap(callback));`,
			`export default /* ${annotation} */ (wrap(callback) satisfies Handler);`,
			`export default /* ${annotation} */ (wrap(callback)!);`,
			`export default /* ${annotation} */ (<Handler>wrap(callback));`,
			`export default /* ${annotation} */ (new Wrapper(callback) as Handler);`,
			`export default /* ${annotation} */ (wrap?.(callback) as Handler);`,
			`export default /* ${annotation} */ (((wrap(callback) as Handler)));`,
			`export default /* ${annotation} */ ((wrap?.(callback) as Handler)! satisfies Handler);`,
			`export default /* ${annotation} */ ((factory() as Wrapper)(callback) as Handler);`,
		].map(code => typescriptCode(code)),
		invalid: [
			...[
				`export default /* ${annotation} */ (wrap(initialize()) as Handler);`,
				`export default /* ${annotation} */ (new Wrapper(initialize()) as Handler);`,
				`export default /* ${annotation} */ (wrap?.(initialize()) as Handler);`,
			].map(code => ({
				...typescriptCode(code),
				errors: [{
					messageId: 'no-top-level-side-effects',
					column: code.indexOf('initialize()') + 1,
					endColumn: code.indexOf('initialize()') + 'initialize()'.length + 1,
				}],
			})),
			...[
				`export default /* ${annotation} */ (wrap() as Handler ? A : B);`,
				`export default /* ${annotation} */ (wrap() as Handler && A);`,
			].map(code => ({...typescriptCode(code), errors: [{messageId: 'no-top-level-side-effects'}]})),
			{
				...typescriptCode(`export default /* ${annotation} */ (wrap() as Handler, initialize());`),
				errors: [{messageId: 'no-top-level-side-effects'}, {messageId: 'no-top-level-side-effects'}],
			},
			...[
				`export default /* ${annotation} */ (wrap(globalThis.value = 1) as Handler);`,
				`export default /* ${annotation} */ ((factory(globalThis.value = 1) as Wrapper)(callback) as Handler);`,
			].map(code => ({...typescriptCode(code), errors: [{messageId: 'global-mutation'}]})),
		],
	});
}

testUnknownCalls({
	valid: [
		'export default /* not @__PURE__ */ wrap(callback);',
		'export default /* @__PURE__ish */ wrap(callback);',
	],
	invalid: [
		'export default /* @__PURE_ */ wrap(callback);',
		'export default /* @__NO_SIDE_EFFECTS__ */ wrap(callback);',
	].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
});

test.snapshot({
	valid: [
		'init();',
		'new App();',
		'import "./polyfill.js";',
		'export const exported = 1;',
		'export const value = 1;',
		'export const exported = 1; value;',
		'export const exported = 1; const response = fetch();',
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
			export const exported = 1;
			init();
		`,
		outdent`
			export const exported = 1;

			function init() {
				document.title = 'gone';
			}
		`,
		outdent`
			export const exported = 1;

			class App {
				static {
					init();
				}
			}
		`,
		outdent`
			export const exported = 1;

			(class {
				field = init();
			});
		`,
		outdent`
			export const exported = 1;

			(class {
				static {
					init();
				}
			});
		`,
		outdent`
			export const exported = 1;

			if (enabled) {
				init();
			}
		`,
	],
	invalid: [
		outdent`
			export const exported = 1;
			init();
		`,
		'export const exported = 1; new App();',
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
			export const exported = 1;

			(class extends init() {});
		`,
		'export const exported = 1; await init();',
		'export const exported = 1; void init();',
		'export const exported = 1; import("./setup.js");',
		'export const exported = 1; app?.init();',
		'export const exported = 1; app.init?.();',
		'export const exported = 1; tag`value`;',
		typescriptCode('export const exported = 1; (tag`value`) as string;'),
	].map(testCase => ({...(typeof testCase === 'string' ? {code: testCase} : testCase), options: [{checkUnknownCalls: true}]})),
});

testUnknownCalls({
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
			`import {${method}} from "react"; export const exported = 1; ${method}(value);`,
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
			'import {memo} from "react"; export const exported = 1; (enabled && memo || initialize)(Link);',
			'import React from "react"; export default (enabled ? React : factory).memo(Link);',
			'import {memo} from "react"; let wrap = memo; wrap = initialize; export default wrap(Link);',
			'import React from "react"; let factory = React; factory = custom; export default factory.memo(Link);',
			'import {memo} from "react"; const wrap = memo; export default wrap(Link);',
			'import {memo} from "react"; export default memo(class { static field = initialize(); });',
			'import {memo} from "react"; export const exported = 1; memo(class { static { initialize(); } });',
			'import {memo} from "react"; export default memo(class { [initialize()]() {} });',
			'import {memo} from "react"; export default (initialize(), memo)(Link);',
			'import React from "react"; export default React[(initialize(), "memo")](Link);',
			'import {memo, forwardRef} from "react"; export default memo(forwardRef(initialize()));',
			'import {memo} from "react"; export const exported = 1; memo(initialize());',
			'import {memo} from "react"; export default memo(Link, initialize());',
			'import {memo} from "react"; export default memo(...initialize());',
			'import {memo} from "react"; export default memo(tag`value`);',
			// Tagged templates nested inside objects remain checked.
			'import {createElement} from "react"; export default createElement("div", {title: tag`value`});',
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
			'import {memo} from "react"; export default memo({Component: initialize()});',
			// eslint-disable-next-line no-template-curly-in-string
			'import figma from "figma"; export default {example: figma.code`<Tag ${figma.helpers.react.renderProp("color", color)} />`};',
		].map(code => ({code, errors: 1})),
		{
			code: 'import {memo} from "react"; export default memo(Link);\ninit();',
			errors: [{
				messageId: 'no-top-level-side-effects', line: 2, column: 1, endLine: 2, endColumn: 7,
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

testUnknownCalls({
	valid: [
		'import {defineComponent} from "vue"; export default defineComponent({setup() { initialize(); }});',
		'import {defineComponent as component} from "vue"; export const exported = 1; component({});',
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
			'import {defineComponent as component} from "vue"; export const exported = 1; component(loadOptions());',
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
	testUnknownCalls({
		valid: [
			`import {globalIgnores} from "${moduleName}"; export default globalIgnores(["dist/"]);`,
			{
				code: `import {defineConfig} from "${moduleName}"; export default defineConfig([]);`,
				filename: 'eslint.config.js',
			},
			`import {defineConfig as configure} from "${moduleName}"; export const exported = 1; configure({rules: {}});`,
			`import * as configHelpers from "${moduleName}"; export default configHelpers.defineConfig([{rules: {}}]);`,
			typescriptCode(`import {defineConfig} from "${moduleName}"; export default defineConfig([]) satisfies Config[];`),
		],
		invalid: [
			...[
				`import {defineConfig} from "${moduleName}"; export default defineConfig(loadConfig());`,
				`import {defineConfig} from "${moduleName}"; export default defineConfig([loadConfig()]);`,
				`import {defineConfig} from "${moduleName}"; export const exported = 1; defineConfig({settings: {value: loadConfig()}});`,
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

testUnknownCalls({
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
	testUnknownCalls({
		valid: [
			`import {${method}} from "${moduleName}"; export default ${method}({});`,
			`import {${method} as configure} from "${moduleName}"; export const exported = 1; configure({});`,
			`import * as configHelpers from "${moduleName}"; export default configHelpers.${method}({});`,
			typescriptCode(`import {${method}} from "${moduleName}"; export default ${method}({}) satisfies Config;`),
		],
		invalid: [
			...[
				`import {${method}} from "${moduleName}"; export default ${method}(loadConfig());`,
				`import {${method}} from "${moduleName}"; export default ${method}({plugins: [initialize()]});`,
				`import {${method} as configure} from "${moduleName}"; export const exported = 1; configure(loadConfig());`,
				`import * as configHelpers from "${moduleName}"; export default configHelpers.${method}(loadConfig());`,
			].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
			{
				code: `import {${method}} from "${moduleName}"; export default ${method}({});\ninit();`,
				errors: [{messageId: 'no-top-level-side-effects', line: 2}],
			},
		],
	});
}

testUnknownCalls({
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

testUnknownCalls({
	valid: [],
	invalid: [
		'import {defineProject} from "vite"; export default defineProject({});',
		'import {defineProject} from "other"; export default defineProject({});',
		'export default defineProject({});',
	].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
});

const defaultAllowOptions = [{allow: {'@company/wrapper': ['default']}}];

testUnknownCalls({
	valid: [
		'import wrap from "@company/wrapper"; export default wrap(Component);',
		'import configure from "@company/wrapper"; export const exported = 1; configure({});',
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
			'import wrap from "@company/wrapper"; export const exported = 1; wrap({value: initialize()});',
			'import wrap from "@company/other"; export default wrap(Component);',
			'import {wrap} from "@company/wrapper"; export default wrap(Component);',
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

testUnknownCalls({
	valid: [
		'import {convertIgnorePatternToMinimatch as convert} from "@eslint/config-helpers"; export default convert("dist/");',
		'import stylistic from "@stylistic/eslint-plugin"; export default stylistic.configs.customize({});',
		'import {default as stylistic} from "@stylistic/eslint-plugin"; export default stylistic?.["configs"].customize?.({});',
		'import stylelint from "stylelint"; export default stylelint.createPlugin("my/rule", rule);',
		'import stylelint from "stylelint"; const {createPlugin: plugin} = stylelint; export default plugin("my/rule", rule);',
		'import {default as stylelint} from "stylelint"; const {createPlugin} = stylelint; export default createPlugin("my/rule", rule);',
		typescriptCode('import stylelint from "stylelint"; const {createPlugin} = (stylelint as typeof stylelint); export default createPlugin("my/rule", rule) satisfies Plugin;'),
	],
	invalid: [
		'import {globalIgnores} from "eslint/config"; export default globalIgnores([initialize()]);',
		'import {convertIgnorePatternToMinimatch} from "eslint/config"; export default convertIgnorePatternToMinimatch("dist/");',
		'import stylistic from "@stylistic/eslint-plugin"; export default stylistic.configs.customize(initialize());',
		'import stylelint from "stylelint"; const {createPlugin} = stylelint; export default createPlugin("my/rule", initialize());',
		'import stylelint from "other"; const {createPlugin} = stylelint; export default createPlugin("my/rule", rule);',
		'import stylelint from "stylelint"; let {createPlugin} = stylelint; export default createPlugin("my/rule", rule);',
		'import stylelint from "stylelint"; const {createPlugin = initialize} = stylelint; export default createPlugin("my/rule", rule);',
		'import stylelint from "stylelint"; const {["createPlugin"]: plugin} = stylelint; export default plugin("my/rule", rule);',
		typescriptCode('import type stylelint from "stylelint"; const {createPlugin} = stylelint; export default createPlugin("my/rule", rule);'),
	].map(testCase => ({...(typeof testCase === 'string' ? {code: testCase} : testCase), errors: [{messageId: 'no-top-level-side-effects'}]})),
});

const memberPathOptions = [{allow: {'@company/config': ['config.builders.create'], '@company/named': ['builders.create']}}];

testUnknownCalls({
	valid: [
		'import helpers from "@company/config"; export default helpers.config.builders.create({});',
		'import * as helpers from "@company/config"; export default helpers.config.builders.create({});',
		'import {builders as configuration} from "@company/named"; export default configuration.create({});',
		'import {builders as configuration} from "@company/named"; const {create: build} = configuration; export default build({});',
	].map(code => ({code, options: memberPathOptions})),
	invalid: [
		'import helpers from "@company/config"; export default helpers.config.builders.create(initialize());',
		'import helpers from "@company/config"; export default helpers.config.builders.other({});',
		'import {builders} from "@company/named"; export default builders.other({});',
		'import {builders} from "@company/named"; const {create: build} = builders; export default build(initialize());',
		'import {builders} from "@company/named"; export default builders[method]({});',
	].map(code => ({code, options: memberPathOptions, errors: [{messageId: 'no-top-level-side-effects'}]})),
});

nodeTest('checks Markdown JavaScript blocks independently', t => {
	const linter = new Linter();
	const config = [
		{files: ['**/*.md'], plugins: {markdown}, processor: 'markdown/markdown'},
		{files: ['**/*.js'], plugins: {unicorn}, rules: {'unicorn/no-top-level-side-effects': 'error'}},
	];
	const messages = linter.verify('```js\nexport const value = 1;\nglobalThis.value = 1;\n```', config, {filename: 'readme.md'});
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].ruleId, 'unicorn/no-top-level-side-effects');
	t.assert.strictEqual(messages[0].messageId, 'global-mutation');
	t.assert.strictEqual(messages[0].line, 3);
	t.assert.deepStrictEqual(linter.verify('```js\nexport const value = 1;\n```\n\n```js\nglobalThis.value = 1;\n```', config, {filename: 'readme.md'}), []);
});

nodeTest('validates the allow option schema', t => {
	const linter = new Linter();
	for (const options of [
		{allow: ['wrap']},
		{allow: {'@company/config': 'wrap'}},
		{allow: {'@company/config': [1]}},
		{checkUnknownCalls: 'true'},
		{checkDefaultExports: true},
		{unknown: true},
	]) {
		t.assert.throws(() => linter.verify('export const exported = 1;', {
			plugins: {unicorn},
			rules: {'unicorn/no-top-level-side-effects': ['error', options]},
		}), {message: /Key "rules"/v});
	}
});

testUnknownCalls({
	valid: [
		'import {defineConfig} from "@company/config"; export default defineConfig({});',
		'import {defineConfig as configure} from "@company/config"; export const exported = 1; configure({});',
		'import * as config from "@company/config"; export default config.defineConfig({});',
		'import {defineConfig, wrap} from "@company/config"; export default wrap(defineConfig({}));',
		'import {wrap} from "@company/config"; export default wrap(() => initialize());',
		'import {memo} from "react"; export default memo(Component);',
		'import {custom} from "react"; export default custom(Component);',
		'import {defineConfig} from "vite"; export default defineConfig({});',
		typescriptCode('import {wrap} from "@company/config"; export default wrap<Props>(Component) satisfies Component;'),
	].map(testCase => ({...(typeof testCase === 'string' ? {code: testCase} : testCase), options: allowOptions})),
	invalid: [
		...[
			'import {defineConfig} from "@company/config"; export default defineConfig(initialize());',
			'import {defineConfig as configure} from "@company/config"; export const exported = 1; configure({value: initialize()});',
			'import * as config from "@company/config"; export default config.defineConfig(initialize());',
			'import {defineConfig, wrap} from "@company/config"; export default wrap(defineConfig(initialize()));',
			'import {other} from "@company/config"; export default other({});',
			'import {defineConfig} from "@company/other"; export default defineConfig({});',
			'import {defineConfig} from "@company/config/extra"; export default defineConfig({});',
			'import {wrap} from "@company/config"; const alias = wrap; export default alias(Component);',
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

testUnknownCalls({
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
	for (const checkUnknownCalls of [false, true]) {
		test({
			testerOptions: {
				languageOptions: {parser, parserOptions: {ecmaFeatures: {jsx: true}}},
			},
			valid: [{
				code: 'export const Component = <Button onClick={() => { globalThis.value = 1; }} />;',
				filename,
				options: [{checkUnknownCalls}],
			}],
			invalid: [{
				code: 'export const Component = <Button value={globalThis.value = 1} />;',
				filename,
				options: [{checkUnknownCalls}],
				errors: [{messageId: 'global-mutation'}],
			}],
		});
	}

	testUnknownCalls({
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
testUnknownCalls({
	valid: [
		'export default {};',
		typescriptCode('import React from "react"; export default React.memo<Props>(Link);'),
		'export default function () {};',
		'export default class {};',
		'const x = 1;\nexport default x;',
	],
	invalid: [
		...[
			// Calls in local assignments are still evaluated immediately.
			'export default value = init();',
			// Class heritage is evaluated when the class is defined.
			'export default class extends init() {}',
			'export default init();',
			'export default new App();',
			'export default (function () { init(); })();',
			'export default (class extends init() {});',
			'export default init`value`;',
		].map(code => ({code, errors: 1})),
	],
});

for (const checkUnknownCalls of [false, true]) {
	test({
		valid: [],
		invalid: [
			...[
				'(Object?.assign)(globalThis, {value: 1});',
				'(Object?.["assign"])?.(globalThis, {value: 1});',
				'(Reflect?.set)(globalThis, "value", 1);',
			].map(code => ({code: moduleCode(code), options: [{checkUnknownCalls}], errors: [{messageId: 'global-mutation'}]})),
			{
				...typescriptCode(moduleCode('((Object?.assign) as typeof Object.assign)(globalThis, {value: 1});')),
				options: [{checkUnknownCalls}],
				errors: [{messageId: 'global-mutation'}],
			},
		],
	});
}

testUnknownCalls({
	valid: [
		'import React from "react"; export default (React?.memo)(Component);',
		'import React from "react"; export default (React?.["memo"])?.(Component);',
		'import stylistic from "@stylistic/eslint-plugin"; export default (stylistic?.configs).customize({});',
		typescriptCode('import React from "react"; export default ((React?.memo) as typeof React.memo)(Component);'),
	],
	invalid: [
		'import React from "react"; export default (React?.memo)(initialize());',
		'import React from "other"; export default (React?.memo)(Component);',
		'import React from "react"; export default (React?.[initialize()])(Component);',
	].map(code => ({code, errors: [{messageId: 'no-top-level-side-effects'}]})),
});
