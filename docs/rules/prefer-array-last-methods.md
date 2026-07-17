# prefer-array-last-methods

📝 Prefer last-oriented array methods over `Array#reverse()` or `Array#toReversed()` followed by a method.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer last-oriented array methods over reversing an array and then calling the forward method.

Last-oriented methods express the traversal direction directly and avoid reversing the array before the operation.

This rule reports `.reverse()` and `.toReversed()` followed by `.find()`, `.findIndex()`, `.indexOf()`, or `.reduce()`.

This rule only provides editor suggestions. The replacement can change observable behavior for mutation, sparse arrays, callback index or array arguments, and index-returning methods.

## Examples

```js
// ❌
const result = array.reverse().find(isUnicorn);

// ✅
const result = array.findLast(isUnicorn);
```

```js
// ❌
const result = array.toReversed().reduce(reducer, initialValue);

// ✅
const result = array.reduceRight(reducer, initialValue);
```
