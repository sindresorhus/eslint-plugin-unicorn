# no-array-sort-for-min-max

📝 Disallow sorting arrays to get the minimum or maximum value.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Sorting an entire array just to read the first or last item does unnecessary `O(n log n)` work. Use [`Math.min()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/min) or [`Math.max()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max) for numeric minimum and maximum values.

This rule reports only simple numeric comparators. Custom comparators, string sorting, object-key sorting, and multi-key sorting are ignored.

This rule is not autofixable because replacing a sort chain can change behavior. `Array#sort()` mutates, empty arrays produce different results, sparse arrays and `NaN` can behave differently, and spreading very large arrays can fail. Editor suggestions are provided for the common case where the replacement is intended.

## Examples

```js
// ❌
const minimum = array.sort((a, b) => a - b)[0];

// ❌
const minimum = array.toSorted((a, b) => a - b).at(0);

// ✅
const minimum = Math.min(...array);
```

```js
// ❌
const maximum = array.sort((a, b) => a - b).at(-1);

// ❌
const maximum = array.toSorted((a, b) => b - a)[0];

// ✅
const maximum = Math.max(...array);
```

```js
// ✅
const sorted = array.toSorted((a, b) => a - b);

// ✅
const first = array.toSorted((a, b) => a.value - b.value)[0];
```
