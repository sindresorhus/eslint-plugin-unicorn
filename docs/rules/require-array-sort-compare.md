# require-array-sort-compare

📝 Require a compare function when calling `Array#sort()` or `Array#toSorted()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`Array#sort()` and `Array#toSorted()` sort elements as strings when no compare function is provided. This can produce surprising results for numbers and mixed values.

## Examples

```js
// ❌
const sorted = values.toSorted();

// ✅
const sorted = values.toSorted((a, b) => a - b);
```

```js
// ❌
values.sort();

// ✅
values.sort((a, b) => a.localeCompare(b));
```
