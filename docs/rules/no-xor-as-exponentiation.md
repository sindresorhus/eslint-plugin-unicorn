# no-xor-as-exponentiation

📝 Disallow the bitwise XOR operator where exponentiation was likely intended.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

In JavaScript, `^` is the [bitwise XOR](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR) operator, not exponentiation. Developers coming from Python, Ruby, or math notation often expect `^` to mean “to the power of”, so `2 ^ 32` silently evaluates to `34` instead of the intended `4294967296`, and `3 ^ 3` is `0` instead of `27`. The actual exponentiation operator is [`**`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Exponentiation).

This rule flags `^` between two decimal integer literals, which is almost always this mistake. Hexadecimal, octal, and binary literals (such as `0xFF ^ 8`) and any non-literal operands (such as `flags ^ MASK`) are ignored, since those are far more likely to be intentional bitwise XOR.

## Examples

```js
// ❌
const kibibyte = 2 ^ 10; // 8, not 1024

// ✅
const kibibyte = 2 ** 10;
```

```js
// ❌
const cube = 3 ^ 3; // 0, not 27

// ✅
const cube = 3 ** 3;
```
