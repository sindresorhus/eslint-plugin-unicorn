# no-top-level-side-effects

📝 Disallow top-level side effects in exported modules.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Top-level side effects run as soon as a module is imported. This can make exported modules harder to test, reuse, and tree-shake.

This rule reports direct top-level expression statements with side effects in files that have ESM exports. It intentionally stays conservative and does not try to prove full module purity.

The rule ignores:

- Files without exports.
- Executable scripts with a shebang.
- Files whose only exports are type-only (`export type`, `export interface`, `export declare`, `export {type Foo}`, …), since those exports are erased when TypeScript is compiled to JavaScript.
- Top-level assignments and declarations, such as `document.title = 'gone';` and `const response = fetch();`.
- Default-exported expressions, such as `export default createConfig();`, unless `checkDefaultExports` is enabled.

Default-exported expressions are allowed by default, consistent with the allowance for variable initializers. The assignment exception is intentionally narrow: other standalone mutation expressions, including `counter++` and `delete object.property`, are reported. When intentionally removing a property while constructing an export, prefer object rest destructuring or locally disable the rule.

Use ESLint config overrides or ignores for project-specific entrypoints, polyfills, or setup files.

Configuration files are not automatically exempt. To disable the rule for tool configuration files, use an ESLint config override:

```js
{
	files: ['**/*.config.{js,mjs,cjs,ts,mts,cts}'],
	rules: {
		'unicorn/no-top-level-side-effects': 'off',
	},
}
```

Direct calls to these imported helpers are allowed:

- `react`: `memo`, `forwardRef`, `lazy`, `createContext`, `createRef`, `createElement`, `cloneElement`, and `isValidElement`.
- `vue`: `defineComponent`.
- `eslint/config` and `@eslint/config-helpers`: `defineConfig` and `globalIgnores`.
- `@eslint/config-helpers`: `convertIgnorePatternToMinimatch`.
- `stylelint`: `createPlugin`.
- `vite`, `rollup`, and `astro/config`: `defineConfig`.
- `vitest/config`: `defineConfig` and `defineProject`.

Supports named imports (including aliases), namespace imports, default imports, and direct `const` destructuring from imported objects. These exceptions do not cover other local aliases, computed or optional calls, conditional callees, or globals.

Nested helpers and helpers inside arrays are allowed, with arguments and array elements checked recursively. Callback bodies are ignored; calls inside objects and spreads remain conservatively checked. The built-in exceptions do not include `includeIgnoreFile`, which reads files.

Tagged templates are checked directly and inside arrays.

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

## Options

### checkDefaultExports

Type: `boolean`\
Default: `false`

Also check default-exported expressions. This stricter mode reports unknown factory calls, even when they only construct the exported value. Use `allow` for trusted imported helpers.

```js
'unicorn/no-top-level-side-effects': ['error', {checkDefaultExports: true}]
```

With this option enabled:

```ts
import React from 'react';

// ❌
export default React.memo<Props>(initialize());

// ✅
export default React.memo<Props>(Link);
```

### allow

Type: `object`\
Default: `{}`

Extend the built-ins by mapping exact import sources to trusted export names or static member paths. Use `'default'` for a directly called default import. Arguments remain checked. Names and sources are matched exactly, without wildcards.

For default imports (including `import {default as configuration}`) and namespace imports, paths such as `'configs.customize'` are relative to the imported object. For other named imports, include the original export name, such as `'builders.create'` for `import {builders as configuration}` followed by `configuration.create()`.

```js
'unicorn/no-top-level-side-effects': [
	'error',
	{
		checkDefaultExports: true,
		allow: {
			'@company/config': ['defineConfig'],
			'@company/wrapper': ['default'],
			'@stylistic/eslint-plugin': ['configs.customize'],
		},
	},
]
```
