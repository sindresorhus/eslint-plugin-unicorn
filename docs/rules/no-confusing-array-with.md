# no-confusing-array-with

📝 Disallow confusing uses of `Array#with()`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`Array#with()` throws a `RangeError` when the index is outside the array bounds.

Avoid using a negative index when the array may be empty, and avoid passing `.length` as the index since it is always outside the valid range.

This rule intentionally does not try to detect length guards. Use `Array#with()` with a clearly valid index.

## Examples

```js
// ❌
const result = array.with(-1, value);

// ✅
const result = array.length === 0 ? array : array.with(array.length - 1, value);
```

```js
// ❌
const result = array.with(array.length, value);

// ✅
const result = [...array, value];
```
