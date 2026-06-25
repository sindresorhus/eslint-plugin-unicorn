# prefer-array-from-range

📝 Prefer `Array.from()` when creating range arrays.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer `Array.from({length}, (_, index) => index)` over spreading `Array(length).keys()`.

This rule only reports direct array materialization from `Array(length).keys()`. Lazy iterator use, `values()`, `entries()`, computed members, optional calls, and shadowed `Array` bindings are ignored.

## Examples

```js
// ❌
const indexes = [...Array(length).keys()];

// ✅
const indexes = Array.from({length}, (_, index) => index);
```

```js
// ❌
const indexes = Array.from(Array(count + 1).keys());

// ✅
const indexes = Array.from({length: count + 1}, (_, index) => index);
```

```js
// ✅
for (const index of Array(length).keys()) {
	console.log(index);
}
```
