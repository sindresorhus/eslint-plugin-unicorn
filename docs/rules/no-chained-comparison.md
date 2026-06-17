# no-chained-comparison

📝 Disallow chained comparisons such as `a < b < c`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Unlike in math (or Python), chained comparisons in JavaScript do not check a range. Comparison operators are binary and left-associative, so `a < b < c` parses as `(a < b) < c`. The first comparison evaluates to a boolean, which is then coerced to `0` or `1` and compared with `c`. This is almost always a bug.

Use `&&` to compare each pair of operands separately.

This rule leaves intentional patterns alone: comparing a comparison result against another boolean value with an equality operator, such as `(a > 0) === (b > 0)`, `(a < b) === true`, or `(a > 0) !== Boolean(b)`.

## Examples

```js
// ❌
if (a < b < c) {}

// ✅
if (a < b && b < c) {}
```

```js
// ❌
if (a === b === c) {}

// ✅
if (a === b && b === c) {}
```

```js
// ✅
// Intentionally comparing two boolean results.
if ((a > 0) === (b > 0)) {}
```
