# no-boolean-sort-comparator

📝 Disallow boolean-returning sort comparators.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Comparators passed to [`Array#sort()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort) and [`Array#toSorted()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted) must return a negative number, a positive number, or zero. Returning `true` or `false` is the same as returning `1` or `0`, so the comparator can never say that the first item should come before the second item. This makes sorting unreliable and can produce different results across JavaScript engines.

Use subtraction for numeric values, or `String#localeCompare()` for strings.

This rule complements [`require-array-sort-compare`](./require-array-sort-compare.md), which only checks that a comparator exists. It also does not overlap with [`prefer-simple-sort-comparator`](./prefer-simple-sort-comparator.md), which simplifies valid numeric comparators that already return numbers.

This rule checks concise comparators, comparators with a single `return` statement, explicit boolean return type annotations, and comparator references that can be statically proven to return booleans. It intentionally does not do full control-flow analysis for multi-branch comparator bodies.

## Examples

```js
// ❌
array.sort((a, b) => a > b);

// ✅
array.sort((a, b) => a - b);
```

```js
// ❌
array.sort((a, b) => a.score >= b.score);

// ✅
array.sort((a, b) => a.score - b.score);
```

```js
// ❌
array.toSorted((a, b) => a === b);

// ✅
array.toSorted((a, b) => a.localeCompare(b));
```

```js
// ✅ Sorting strings
array.sort((a, b) => a.localeCompare(b));
```
