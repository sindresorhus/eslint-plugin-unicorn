# no-top-level-side-effects

📝 Disallow top-level side effects in exported modules.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Top-level side effects run as soon as a module is imported. This can make exported modules harder to test, reuse, and tree-shake.

This rule reports direct top-level expression statements with side effects in files that have ESM exports. It intentionally stays conservative and does not try to prove full module purity.

The rule ignores files without exports and executable scripts with a shebang. Files whose only exports are type-only (`export type`, `export interface`, `export declare`, `export {type Foo}`, …) are treated as having no exports, since those exports are erased when TypeScript is compiled to JavaScript. Top-level assignments and declarations are also out of scope, so `document.title = 'gone';` and `const response = fetch();` are not reported. Use ESLint config overrides or ignores for project-specific entrypoints, polyfills, or setup files.

When using `vue-eslint-parser`, direct top-level expression statements inside `<script setup>` are ignored because that block is compiled into `setup()` and runs per component instance rather than at module scope. The normal `<script>` block in the same component is still checked when the parsed module has a runtime export.

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
