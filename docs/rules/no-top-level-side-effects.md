# no-top-level-side-effects

📝 Disallow top-level side effects.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Top-level side effects run as soon as a module is imported. This can make modules harder to tree-shake, test, and reuse.

This rule reports top-level expression statements that have side effects in modules with exports. It does not report declarations, assignments, hashbang files, files without exports, or code inside functions or classes.

## Examples

```js
// ❌
export {};
init();
```

```js
// ❌
export {};
new App();
```

```js
// ✅
function init() {
	document.title = 'gone';
}
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
