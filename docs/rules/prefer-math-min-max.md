# Prefer `Math.min()` and `Math.max()` over ternaries for simple comparisons

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces the use of `Math.min()` and `Math.max()` functions instead of ternary expressions when performing simple comparisons, such as selecting the minimum or maximum value between two or more options.

By replacing ternary expressions with these functions, the code becomes more concise, easier to understand, and less prone to errors. It also enhances consistency across the codebase, ensuring that the same approach is used for similar operations, ultimately improving the overall readability and maintainability of the code.

## Examples

<!-- Math.min() -->

```js
height > 50 ? 50 : height; // ❌
Math.min(height, 50); // ✅
```

```js
height >= 50 ? 50 : height; // ❌
Math.min(height, 50); // ✅
```

```js
height < 50 ? height : 50; // ❌
Math.min(height, 50); // ✅
```

```js
height <= 50 ? height : 50; // ❌
Math.min(height, 50); // ✅
```

<!-- Math.max() -->

```js
height > 50 ? height : 50; // ❌
Math.max(height, 50); // ✅
```

```js
height >= 50 ? height : 50; // ❌
Math.max(height, 50); // ✅
```

```js
height < 50 ? 50 : height; // ❌
Math.max(height, 50); // ✅
```

```js
height <= 50 ? 50 : height; // ❌
Math.max(height, 50); // ✅
```
