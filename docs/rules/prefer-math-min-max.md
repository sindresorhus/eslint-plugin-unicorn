# Prefer `Math.min()` and `Math.max()` over ternaries for simple comparisons

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforce the use of `Math.min()` and `Math.max()` instead of ternary expressions for simple comparisons. This makes the code more readable.

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
