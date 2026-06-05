# consistent-existence-index-check

📝 Enforce consistent style for element existence checks with `indexOf()`, `lastIndexOf()`, `findIndex()`, and `findLastIndex()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforce consistent style for element existence checks with `indexOf()`, `lastIndexOf()`, `findIndex()`, and `findLastIndex()`.

Prefer using `index === -1` to check if an element does not exist and `index !== -1` to check if an element does exist.

Similar to the [`explicit-length-check`](explicit-length-check.md) rule.

## Examples

```js
const index = foo.indexOf('bar');

// ❌
if (index < 0) {}

// ✅
if (index === -1) {}
```

```js
const index = foo.indexOf('bar');

// ❌
if (index >= 0) {}

// ✅
if (index !== -1) {}
```

```js
const index = foo.indexOf('bar');

// ❌
if (index > -1) {}

// ✅
if (index !== -1) {}
```

```js
const index = foo.lastIndexOf('bar');

// ❌
if (index >= 0) {}

// ✅
if (index !== -1) {}
```

```js
const index = array.findIndex(element => element > 10);

// ❌
if (index < 0) {}

// ✅
if (index === -1) {}
```

```js
const index = array.findLastIndex(element => element > 10);

// ❌
if (index < 0) {}

// ✅
if (index === -1) {}
```
