# prefer-unary-minus

📝 Prefer the unary minus operator over multiplying or dividing by `-1`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Multiplying or dividing a value by `-1` is a roundabout way to negate it. The unary minus operator (`-x`) is shorter and states the intent directly.

This rule flags:

- `x * -1` and `-1 * x`
- `x / -1`

Division is not commutative, so `-1 / x` is left alone (it is `-1 / x`, not `-x`).

## Examples

```js
// ❌
const inverted = value * -1;

// ✅
const inverted = -value;
```

```js
// ❌
const flipped = -1 * someNumber;

// ✅
const flipped = -someNumber;
```

```js
// ❌
const divided = value / -1;

// ✅
const divided = -value;
```
