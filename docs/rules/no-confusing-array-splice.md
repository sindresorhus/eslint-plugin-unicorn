# no-confusing-array-splice

📝 Disallow confusing uses of `Array#{splice,toSpliced}()`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Some `Array#splice()` and `Array#toSpliced()` calls are harder to read than the operation they express.

Use assignment when replacing one element in place, and use `Array#with()` when creating a copy with one element replaced. Resolve negative indexes before assigning with bracket notation.

For insertion at `-1`, prefer spelling out the intended boundary behavior instead of relying on `splice()` index normalization.

This rule does not automatically fix code because `splice()`, `toSpliced()`, assignment, and `with()` behave differently for return values, negative indexes, and out-of-range indexes.

## Examples

```js
// ❌
array.splice(index, 1, element);

// ✅
array[index] = element;
```

```js
// ❌
const result = array.toSpliced(index, 1, element);

// ✅
const result = array.with(index, element);
```

```js
// ❌
array.splice(-1, 0, element);

// ✅
const insertionIndex = Math.max(array.length - 1, 0);
array.splice(insertionIndex, 0, element);
```

```js
// ❌
const result = array.toSpliced(-1, 0, element);

// ✅
const insertionIndex = Math.max(array.length - 1, 0);
const result = array.toSpliced(insertionIndex, 0, element);
```
