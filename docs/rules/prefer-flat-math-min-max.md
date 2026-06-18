# prefer-flat-math-min-max

📝 Prefer flat `Math.min()` and `Math.max()` calls over nested calls.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`Math.min()` and `Math.max()` accept any number of arguments, so nesting the same call is unnecessary.

## Examples

```js
// ❌
const biggest = Math.max(Math.max(a, b), c);

// ✅
const biggest = Math.max(a, b, c);
```

```js
// ❌
const smallest = Math.min(a, Math.min(b, c));

// ✅
const smallest = Math.min(a, b, c);
```

```js
// ✅
const clamped = Math.max(Math.min(value, upper), lower);
```
