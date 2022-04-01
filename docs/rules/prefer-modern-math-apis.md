# Prefer modern `Math` APIs over legacy patterns

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

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

## Prefer `Math.log10(x)` over

```js
Math.log(x) * Math.LOG10E
```

```js
Math.LOG10E * Math.log(x)
```

```js
Math.log(x) / Math.LN10
```

## Prefer `Math.log2(x)` over

```js
Math.log(x) * Math.LOG2E
```

```js
Math.LOG2E * Math.log(x)
```

```js
Math.log(x) / Math.LN2
```

## Separate rule for `Math.trunc()`

See [`unicorn/prefer-math-trunc`](./prefer-math-trunc.md) rule.
