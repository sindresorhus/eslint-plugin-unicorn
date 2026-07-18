# prefer-math-abs

📝 Prefer `Math.abs()` over manual absolute value expressions and symmetric range checks.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces the use of `Math.abs()` instead of hand-written absolute value expressions and symmetric range checks.

`Math.abs()` states the intent directly and avoids duplicating the two sides of an absolute-value calculation.

## Examples

```js
// ❌
const absolute = value < 0 ? -value : value;

// ❌
const absolute = value <= 0 ? 0 - value : value;

// ❌
const absolute = value > 0 ? value : -value;

// ✅
const absolute = Math.abs(value);
```

```js
// ❌
if (number > MAXIMUM || number < -MAXIMUM) {
}

// ✅
if (Math.abs(number) > MAXIMUM) {
}
```
