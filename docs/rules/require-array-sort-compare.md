# require-array-sort-compare

📝 Require a compare function when calling `Array#sort()` or `Array#toSorted()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Without an explicit compare function, [`Array#sort()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort) and [`Array#toSorted()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted) sort elements by converting them to strings, which produces unexpected results for numbers and other non-string values.

## Examples

```js
// ❌ - Sorts as strings: [1, 10, 2, 20, 3]
const numbers = [3, 1, 10, 2, 20];
numbers.toSorted();

// ✅ - Properly numeric sort: [1, 2, 3, 10, 20]
const numbers = [3, 1, 10, 2, 20];
numbers.toSorted((a, b) => a - b);
```

```js
// ❌ - String sorting on numbers is wrong
[5, 10, 15, 2, 25].sort();
// → [10, 15, 2, 25, 5] (unexpected!)

// ✅
[5, 10, 15, 2, 25].sort((a, b) => a - b);
// → [2, 5, 10, 15, 25]
```

```js
// ❌ - Sorting strings without explicit compare
const names = ['Alice', 'bob', 'Charlie'];
names.sort();
// → ['Alice', 'Charlie', 'bob'] (case-sensitive)

// ✅ - Case-insensitive sorting
const names = ['Alice', 'bob', 'Charlie'];
names.sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
// → ['Alice', 'bob', 'Charlie']
```

```js
// ✅ - Descending order
const numbers = [3, 1, 4, 1, 5, 9];
numbers.sort((a, b) => b - a); // [9, 5, 4, 3, 1, 1]
```
