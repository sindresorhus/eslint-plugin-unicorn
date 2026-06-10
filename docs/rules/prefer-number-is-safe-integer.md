# prefer-number-is-safe-integer

📝 Prefer `Number.isSafeInteger()` over `Number.isInteger()`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Number.isSafeInteger()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger) checks that a value is an integer _and_ that it can be exactly represented, that is, it is within the safe integer range `[-(2 ** 53 - 1), 2 ** 53 - 1]`. [`Number.isInteger()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger) returns `true` for larger integers that can no longer be represented precisely, which is rarely what you want.

This rule only provides a suggestion, not an automatic fix, because the two methods are not equivalent: `Number.isInteger(2 ** 53)` is `true` while `Number.isSafeInteger(2 ** 53)` is `false`. Review each case before applying the suggestion, especially negated checks like `!Number.isInteger(x)`, where switching to `Number.isSafeInteger()` widens the set of values treated as “not an integer”.

## Examples

```js
// ❌
if (!Number.isInteger(index)) {
	throw new Error('Expected an integer.');
}

// ✅
if (!Number.isSafeInteger(index)) {
	throw new Error('Expected a safe integer.');
}
```
