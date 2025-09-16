# Disallow useless array length check

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

- `Array#some()` returns `false` for an empty array. There is no need to check if the array is not empty.
- `Array#every()` returns `true` for an empty array. There is no need to check if the array is empty.

We only check `.length === 0`, `.length !== 0`, and `.length > 0`. These zero and non-zero length check styles are allowed in the [`unicorn/explicit-length-check`](./explicit-length-check.md#options) rule. It is recommended to use them together.

## Examples

```js
// ❌
if (array.length === 0 || array.every(Boolean));
```

```js
// ❌
if (array.length !== 0 && array.some(Boolean));

// ✅
if (array.every(Boolean));
```

```js
// ❌
if (array.length > 0 && array.some(Boolean));

// ✅
if (array.some(Boolean));
```

```js
// ❌
const isAllTrulyOrEmpty = array.length === 0 || array.every(Boolean);

// ✅
const isAllTrulyOrEmpty = array.every(Boolean);
```

```js
// ✅
if (array.length === 0 || anotherCheck() || array.every(Boolean));
```

```js
// ✅
const isNonEmptyAllTrulyArray = array.length > 0 && array.every(Boolean);
```

```js
// ✅
const isEmptyArrayOrAllTruly = array.length === 0 || array.some(Boolean);
```
