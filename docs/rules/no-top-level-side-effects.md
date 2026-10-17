# no-top-level-side-effects

📝 Disallow top-level side effects in exported modules.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports explicit global mutations when importing ES modules with runtime exports. Unknown calls are allowed by default; enable `checkUnknownCalls` to also check invocations whose effects are unknown.

The default checks assignments, updates, and deletions whose target is rooted in a built-in or configured global binding. It also checks these standard operations when their first argument is such a target:

- `Object.assign`, `Object.defineProperty`, `Object.defineProperties`, `Object.freeze`, `Object.seal`, `Object.preventExtensions`, and `Object.setPrototypeOf`.
- `Reflect.defineProperty`, `Reflect.deleteProperty`, `Reflect.set` (three arguments without spread), `Reflect.preventExtensions`, and `Reflect.setPrototypeOf`.

Configure environment globals such as `window` and `process` through ESLint's [`languageOptions.globals`](https://eslint.org/docs/latest/use/configure/language-options#specifying-globals). Local bindings that shadow globals are ignored.

Both modes check declarations, default exports, conditionals, computed class keys, and static initialization. Function bodies (including immediately invoked functions) and instance field values are ignored. Aliases, imported objects, and targets returned by calls are not resolved. The rule does not prove purity or branch reachability.

Files without runtime exports (including empty `export {}` and type-only exports), shebang scripts, and Astro/Svelte components are ignored. With `vue-eslint-parser`, the normal module `<script>` is checked; `<script setup>` is ignored.

## Examples

```js
export const version = 1;

// ❌
globalThis.application = createApplication();

// ✅
const application = createApplication();
```

```js
export const options = {};

// ❌
Object.assign(globalThis, {options});

// ✅
Object.assign(options, {timeout: 1000});
```

## Options

### checkUnknownCalls

Type: `boolean`\
Default: `false`

Also report untrusted function and constructor calls, tagged templates, and dynamic imports during module evaluation. This may flag harmless initialization. Static imports, bare `await`, and local assignments, updates, and deletions remain allowed.

```js
'unicorn/no-top-level-side-effects': ['error', {checkUnknownCalls: true}]
```

With this option enabled:

```js
export const version = 1;

// ❌
const handler = initialize();

// ✅
function createHandler() {
	return initialize();
}
```

Direct calls to these imported helpers are trusted:

- `react`: `memo`, `forwardRef`, `lazy`, `createContext`, `createRef`, `createElement`, `cloneElement`, and `isValidElement`.
- `vue`: `defineComponent`.
- `eslint/config` and `@eslint/config-helpers`: `defineConfig` and `globalIgnores`.
- `@eslint/config-helpers`: `convertIgnorePatternToMinimatch`.
- `@stylistic/eslint-plugin`: `configs.customize`.
- `stylelint`: `createPlugin`.
- `vite`, `rollup`, and `astro/config`: `defineConfig`.
- `vitest/config`: `defineConfig` and `defineProject`.
- `memoize`, `debounce`, `onetime`, `p-memoize`, and `throttleit`: the default export.
- `p-debounce`: the default export and its `.promise()` method.
- `p-limit`: the default export and `limitFunction`.
- `node:util`: `promisify` and `callbackify`.
- `lodash` and `lodash-es`: `debounce`, `throttle`, `memoize`, and `once`, including default imports from their corresponding subpaths with or without `.js`.

Named imports (including aliases), namespace and default imports, direct `const` destructuring from imported objects, literal string properties, and optional calls are supported. Other local aliases, dynamic properties, conditional callees, and globals remain untrusted. Evaluated arguments are still checked.

### allow

Type: `object`\
Default: `{}`

Map exact import sources to trusted export names or member paths. Use `'default'` for a directly called default import. Member paths are relative to default/namespace imports; for named imports, include the original export name. This only affects `checkUnknownCalls`; explicit global mutations remain reportable.

```js
'unicorn/no-top-level-side-effects': [
	'error',
	{
		checkUnknownCalls: true,
		allow: {
			'@company/config': ['defineConfig', 'configs.customize'],
			'@company/wrapper': ['default'],
		},
	},
]
```

## Pure annotations

With `checkUnknownCalls` enabled, `/* @__PURE__ */` and `/* #__PURE__ */` immediately before a call or constructor invocation (including parenthesized invocations) trust it and its callee expression. Comments may include explanations; immediate arguments are still checked.

```js
// ❌
export default /* @__PURE__ */ wrap(createHandler());

// ✅
export default /* @__PURE__ Creates a wrapper. */ wrap(() => createHandler());
```

Explicit global mutations are still reported, even inside trusted callees or arguments. PURE annotations affect bundling; only annotate invocations that can be discarded when their results are unused.

## Intentional initialization

For intentional global mutations, use an ESLint disable comment with a reason:

```js
export const application = createApplication();

// eslint-disable-next-line unicorn/no-top-level-side-effects -- Expose the application to legacy scripts.
globalThis.application = application;
```

With `checkUnknownCalls`, consider file-specific overrides for intentional initialization entrypoints, such as Storybook preview configuration or Next.js client instrumentation.
