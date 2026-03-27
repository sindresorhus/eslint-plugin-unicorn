# prefer-modern-math-apis

📝 Prefer modern `Math` APIs over legacy patterns.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Math additions in ES2015:

- [Math.sign()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sign)
- [Math.trunc()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc)
- [Math.cbrt()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/cbrt)
- [Math.expm1()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/expm1)
- [Math.log1p()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log1p)
- [Math.log10()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log10)
- [Math.log2()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log2)
- [Math.sinh()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sinh)
- [Math.cosh()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/cosh)
- [Math.tanh()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/tanh)
- [Math.asinh()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/asinh)
- [Math.acosh()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/acosh)
- [Math.atanh()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/atanh)
- [Math.hypot()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/hypot)
- [Math.clz32()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32)
- [Math.imul()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul)
- [Math.fround()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround)

Currently, we only check a few known cases, but we are open to add more patterns.

If you find a suitable case for this rule, please [open an issue](https://github.com/sindresorhus/eslint-plugin-unicorn/issues/new?title=%20%60prefer-modern-math-apis%60%20%20change%20request&labels=evaluating).

## Examples

```js
// ❌
Math.log(x) * Math.LOG10E

// ❌
Math.LOG10E * Math.log(x)

// ❌
Math.log(x) / Math.LN10

// ✅
Math.log10(x)
```

```js
// ❌
Math.log(x) * Math.LOG2E

// ❌
Math.LOG2E * Math.log(x)

// ❌
Math.log(x) / Math.LN2

// ✅
Math.log2(x)
```

```js
// ❌
Math.sqrt(a * a + b * b)

// ❌
Math.sqrt(a ** 2 + b ** 2)

// ✅
Math.hypot(a, b)
```

```js
// ❌
Math.sqrt(x ** 2)

// ✅
Math.abs(x)
```

## Separate rule for `Math.trunc()`

See [`unicorn/prefer-math-trunc`](./prefer-math-trunc.md) rule.
