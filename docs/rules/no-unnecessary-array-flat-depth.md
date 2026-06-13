# no-unnecessary-array-flat-depth

📝 Disallow using `1` as the `depth` argument of `Array#flat()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The default depth for [`Array#flat()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat) is `1`, so explicitly passing `1` is redundant.

## Examples

```js
const nested = [1, [2, 3], [4, [5]]];

// ❌ - Explicit 1 is unnecessary
nested.flat(1);
// → [1, 2, 3, 4, [5]]

// ✅ - Default depth is 1
nested.flat();
// → [1, 2, 3, 4, [5]]
```

```js
// ❌
const rows = [[1, 2], [3, 4]];
rows.flat(1);

// ✅
const rows = [[1, 2], [3, 4]];
rows.flat();
```

```js
// ✅ - Use depth > 1 when you need deeper flattening
const deeplyNested = [1, [2, [3, [4]]]];
deeplyNested.flat(2);
// → [1, 2, 3, [4]]
```

```js
// ❌
array?.flat(1);

// ✅
array?.flat();
```
