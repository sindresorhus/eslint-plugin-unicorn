# prefer-math-constants

📝 Prefer `Math` constants over their approximate numeric values.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Hand-written numbers like `3.14` or `2.718` are imprecise approximations of [`Math`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math) constants. The built-in constants are more precise, self-documenting, and less error-prone than a truncated or rounded literal.

This rule covers the numeric `Math` properties: [`Math.PI`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/PI), [`Math.E`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/E), [`Math.LN2`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/LN2), [`Math.LN10`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/LN10), [`Math.LOG2E`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/LOG2E), [`Math.LOG10E`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/LOG10E), [`Math.SQRT2`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/SQRT2), and [`Math.SQRT1_2`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/SQRT1_2).

Since the built-in value is not exactly equal to the approximate literal, replacing it could change a result, so this is a suggestion rather than an auto-fix.

## Examples

```js
// ❌
const area = 3.14 * radius ** 2;

// ✅
const area = Math.PI * radius ** 2;
```

```js
// ❌
const growth = amount * 2.718;

// ✅
const growth = amount * Math.E;
```

```js
// ❌
const diagonal = side * 1.4142;

// ✅
const diagonal = side * Math.SQRT2;
```
