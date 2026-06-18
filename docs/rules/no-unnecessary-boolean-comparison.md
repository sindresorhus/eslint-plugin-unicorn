# no-unnecessary-boolean-comparison

📝 Disallow unnecessary comparisons against boolean literals.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Comparing a value that is already known to be boolean against `true` or `false` adds noise without changing the result.

This rule only reports comparisons where the non-literal side is known to be boolean. It intentionally does not report unknown values like `value === true`, because strict identity comparison against `true` is not equivalent to a truthiness check.

## Examples

```js
// ❌
if ((a > b) === true) {}

// ✅
if (a > b) {}
```

```js
// ❌
if ((a > b) === false) {}

// ✅
if (!(a > b)) {}
```

```js
// ❌
const active = Boolean(value) !== false;

// ✅
const active = Boolean(value);
```

```js
// ✅
if (value === true) {}
```
