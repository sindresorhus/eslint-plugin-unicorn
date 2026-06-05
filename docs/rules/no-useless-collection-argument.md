# no-useless-collection-argument

📝 Disallow useless values or fallbacks in `Set`, `Map`, `WeakSet`, or `WeakMap`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

It's unnecessary to pass an empty array or string when constructing a `Set`, `Map`, `WeakSet`, or `WeakMap`, since they accept nullish values.

It's also unnecessary to provide a fallback for possible nullish values.

## Examples

```js
// ❌
const set = new Set([]);
// ❌
const set = new Set("");

// ✅
const set = new Set();
```

```js
// ❌
const set = new Set(foo ?? []);
// ❌
const set = new Set(foo ?? "");

// ✅
const set = new Set(foo);
```
