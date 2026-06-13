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

```js
// ❌
// This is problematic because Numbers larger than 2^53 - 1 lose precision
const largeNumber = 9007199254740992; // 2^53
Number.isInteger(largeNumber); // true (misleading!)
largeNumber === 9007199254740993; // true (precision lost!)

// ✅
Number.isSafeInteger(largeNumber); // false (correctly identifies the issue)
```

```js
// ❌
function processId(id) {
	if (!Number.isInteger(id)) {
		throw new Error('Invalid ID');
	}
	// id could still be too large to represent exactly
}

// ✅
function processId(id) {
	if (!Number.isSafeInteger(id)) {
		throw new Error('Invalid ID');
	}
	// id is guaranteed to be safely representable
}
```
