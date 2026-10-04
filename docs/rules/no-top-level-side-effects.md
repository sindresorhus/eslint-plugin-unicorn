# no-top-level-side-effects

📝 Disallow top-level side effects in exported modules.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Top-level side effects run as soon as a module is imported. This can make exported modules harder to test, reuse, and tree-shake.

This rule reports direct top-level expression statements and default-exported expressions with side effects in files that have ESM exports. It intentionally stays conservative and does not try to prove full module purity.

The rule ignores:

- Files without exports.
- Executable scripts with a shebang.
- Files whose only exports are type-only (`export type`, `export interface`, `export declare`, `export {type Foo}`, …), since those exports are erased when TypeScript is compiled to JavaScript.
- Top-level assignments and declarations, such as `document.title = 'gone';` and `const response = fetch();`.

A default-exported expression is not a declaration, so `export default init();` is reported. The assignment exception is intentionally narrow: other mutation expressions, including `counter++` and `delete object.property`, are reported. When intentionally removing a property while constructing an export, prefer object rest destructuring or locally disable the rule.

Use ESLint config overrides or ignores for project-specific entrypoints, polyfills, or setup files.

Direct calls to these imported helpers are allowed:

- `react`: `memo`, `forwardRef`, `lazy`, `createContext`, `createRef`, `createElement`, `cloneElement`, and `isValidElement`.
- `vue`: `defineComponent`.
- `eslint/config`, `@eslint/config-helpers`, `vite`, `rollup`, and `astro/config`: `defineConfig`.
- `vitest/config`: `defineConfig` and `defineProject`.

Supports named imports (including aliases), namespace imports, and React default imports. Local aliases, computed or optional calls, conditional callees, and globals remain checked.

Nested helpers are allowed, with arguments checked recursively. Callback bodies are ignored; calls inside objects or arrays remain conservatively checked.

Only direct tagged templates are checked.

With `vue-eslint-parser`, direct top-level expressions in `<script setup>` are ignored because they run in component setup scope, not module scope. The normal `<script>` is still checked when the module has a runtime export.

```vue
<script>
export default {};
runSideEffectOnce(); // ❌
</script>

<script setup>
import {watch} from 'vue';
watch(source, callback); // ✅
</script>
```

## Examples

```js
// ❌
export {};
init();

// ✅
export {};
function init() {
	document.title = 'gone';
}
```

```js
// ❌
export {};
new App();

// ✅
new App();
```

```js
// ✅
export {};
const response = fetch();
```

```js
// ✅
export {};
document.title = 'gone';
```

```ts
import React from 'react';

// ❌
export default React.memo<Props>(initialize());

// ✅
export default React.memo<Props>(Link);
```

## Options

### allow

Type: `object`\
Default: `{}`

Extend the built-ins by mapping exact import sources to pure export names. Use `'default'` for default imports. Arguments remain checked.

```js
'unicorn/no-top-level-side-effects': [
	'error',
	{
		allow: {
			'@company/config': ['defineConfig'],
			'@company/wrapper': ['default'],
		},
	},
]
```
