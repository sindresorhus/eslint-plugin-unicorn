# no-subtraction-comparison

📝 Prefer comparing values directly over subtracting and comparing to `0`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Subtracting two values only to compare the difference with `0` obscures the intent. Comparing the values directly is shorter and clearer.

This pattern is often a leftover from code that previously used a comparator function (for example, `(a, b) => a - b`).

## Examples

```js
// ❌
if (a - b > 0) {}

// ✅
if (a > b) {}
```

```js
// ❌
if (a - b <= 0) {}

// ✅
if (a <= b) {}
```

```js
// ❌
if (0 < a - b) {}

// ✅
if (a > b) {}
```

```js
// ❌
if (a - b === 0) {}

// ✅
if (a === b) {}
```

## Caveats

The rewrite is only behavior-preserving for numbers. For example, `"10" - "5" > 0` is `true`, but `"10" > "5"` is `false`, since strings compare lexicographically. The rule auto-fixes strict ordering comparisons (`>` and `<`) when both operands are known to be numbers. For non-strict ordering and equality comparisons, it auto-fixes only when both operands are statically known finite numbers. Otherwise, the rule offers a suggestion instead of an auto-fix.

The extra restriction for non-strict ordering and equality comparisons avoids the infinity edge case: `Infinity - Infinity` is `NaN`, so `Infinity - Infinity >= 0` is `false` while `Infinity >= Infinity` is `true`.
