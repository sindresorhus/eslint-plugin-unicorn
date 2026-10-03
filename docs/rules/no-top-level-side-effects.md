# no-top-level-side-effects

📝 Disallow top-level side effects in exported modules.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Top-level side effects run as soon as a module is imported. This can make exported modules harder to test, reuse, and tree-shake.

This rule reports direct top-level expression statements and default-exported expressions with side effects in files that have ESM exports. It intentionally stays conservative and does not try to prove full module purity.

The rule ignores files without exports and executable scripts with a shebang. Files whose only exports are type-only (`export type`, `export interface`, `export declare`, `export {type Foo}`, …) are treated as having no exports, since those exports are erased when TypeScript is compiled to JavaScript. Top-level assignments and declarations are also out of scope, so `document.title = 'gone';` and `const response = fetch();` are not reported. A default-exported expression is not a declaration, so `export default init();` is reported. This assignment exception is intentionally narrow: other mutation expressions, including `counter++` and `delete object.property`, are reported. When intentionally removing a property while constructing an export, prefer object rest destructuring or locally disable the rule. Use ESLint config overrides or ignores for project-specific entrypoints, polyfills, or setup files.

Direct calls to `memo`, `forwardRef`, `lazy`, `createContext`, `createRef`, `createElement`, `cloneElement`, and `isValidElement` imported from `react` are allowed, including nested calls such as `memo(forwardRef(Component))`. Default, namespace, and named imports are supported, including import aliases. Calls through local variable aliases, computed members, optional chains, or conditional expressions remain conservatively checked. Globally supplied React objects are not recognized.

Direct calls to these configuration helpers are also allowed, including named import aliases and namespace imports:

| Import source | Allowed helpers |
| --- | --- |
| `eslint/config` | `defineConfig` |
| `@eslint/config-helpers` | `defineConfig` |
| `vite` | `defineConfig` |
| `vitest/config` | `defineConfig`, `defineProject` |
| `rollup` | `defineConfig` |
| `astro/config` | `defineConfig` |

Other helpers, such as `globalIgnores` and `includeIgnoreFile`, are still reported.

Arguments of allowed calls are still checked for side effects, so `memo(initialize())` and `defineConfig([loadConfig()])` are reported. These allowances apply to standalone top-level expression statements and default exports. Calls inside arbitrary object or array expressions remain conservatively checked.

Tagged templates are checked when they are direct arguments. Tags nested in other expressions, such as object properties, are outside this rule's analysis.

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

```js
import {memo, forwardRef} from 'react';

// ❌
export default memo(initialize());

// ✅
export default memo(forwardRef(Component));
```

```ts
import React from 'react';

// ❌
export default React.memo<Props>(initialize());

// ✅
export default React.memo<Props>(Link);
```

```js
import {defineConfig} from 'eslint/config';

// ❌
export default defineConfig([loadConfig()]);

// ✅
export default defineConfig([{rules: {}}]);
```

```js
import {defineConfig} from 'vite';

// ❌
export default defineConfig({plugins: [initializePlugin()]});

// ✅
export default defineConfig(() => ({plugins: [initializePlugin()]}));
```

Calls inside configuration callbacks are deferred until the callback runs, so they are not top-level side effects.

## Figma Code Connect templates

Figma Code Connect template bodies run inside a function rather than at module scope. Disable this rule for template files with an ESLint config override, adjusting the file pattern to match your project:

```js
export default [
	{
		files: ['**/*.figma.template.{js,ts}'],
		rules: {
			'unicorn/no-top-level-side-effects': 'off',
		},
	},
];
```
