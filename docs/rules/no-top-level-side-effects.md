# no-top-level-side-effects

📝 Disallow top-level side effects in exported modules.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Top-level side effects run as soon as a module is imported. This can make exported modules harder to test, reuse, and tree-shake.

This rule reports direct top-level expression statements with side effects in files that have ESM exports. It intentionally stays conservative and does not try to prove full module purity.

The rule ignores files without exports and executable scripts with a shebang. It also allows top-level assignments and declarations, so `document.title = 'gone';` and `const response = fetch();` are not reported. Use ESLint config overrides or ignores for project-specific entrypoints, polyfills, or setup files.

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
