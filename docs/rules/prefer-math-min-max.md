# prefer-math-min-max

📝 Prefer `Math.min()` and `Math.max()` over ternaries for simple comparisons.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces the use of `Math.min()` and `Math.max()` functions instead of ternary expressions when performing simple comparisons, such as selecting the minimum or maximum value between two or more options.

By replacing ternary expressions with these functions, the code becomes more concise, easier to understand, and less prone to errors. It also enhances consistency across the codebase, ensuring that the same approach is used for similar operations, ultimately improving the overall readability and maintainability of the code.

In TypeScript, this rule only reports comparisons when both operands are known to be numbers. Enable typed linting to recognize inferred types, such as callback parameters. Without type information, the rule uses explicit annotations and locally recognizable numeric expressions.

In JavaScript, unknown operand types are allowed, but recognized non-number types are skipped.

Suggestions are limited to simple operand expressions. Comparisons involving calls, mutations, spread, JSX, or constructed values may be reported without a suggestion to avoid changing side effects.

## Examples

```js
// ❌
height > 50 ? 50 : height;

// ❌
height >= 50 ? 50 : height;

// ❌
height < 50 ? height : 50;

// ❌
height <= 50 ? height : 50;

// ✅
Math.min(height, 50);
```

```js
// ❌
height > 50 ? height : 50;

// ❌
height >= 50 ? height : 50;

// ❌
height < 50 ? 50 : height;

// ❌
height <= 50 ? 50 : height;

// ✅
Math.max(height, 50);
```

> [!NOTE]
> This rule offers suggestions instead of autofixes because comparisons and `Math.min()`/`Math.max()` handle `NaN`, signed zero, and non-number values differently. For example, `a > b ? a : b` returns `b` when `a` is `NaN`, while `Math.max(a, b)` returns `NaN`. Check these behaviors before applying a suggestion.
