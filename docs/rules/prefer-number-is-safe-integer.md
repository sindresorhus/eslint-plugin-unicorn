# prefer-number-is-safe-integer

📝 Prefer `Number.isSafeInteger()` over integer checks.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Number.isSafeInteger()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger) checks whether a value is an integer in the safe range `[-(2 ** 53 - 1), 2 ** 53 - 1]`. [`Number.isInteger()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger) can return `true` outside that range, where different integers can round to the same number.

This rule also reports common integer checks like `value % 1 === 0`, `Math.trunc(value) === value`, `Math.floor(value) === value`, and Lodash/Underscore `isInteger()`/`isSafeInteger()` calls.

This rule only provides a suggestion, not an automatic fix, because these checks are not all equivalent: `Number.isInteger(2 ** 53)` is `true` while `Number.isSafeInteger(2 ** 53)` is `false`, and `[['1']] % 1 === 0` is `true` while `Number.isSafeInteger([['1']])` is `false`. Review each case before applying the suggestion, especially negated checks like `!Number.isInteger(x)`, where switching to `Number.isSafeInteger()` widens the set of values treated as “not an integer”.

This rule intentionally ignores less clear coercion and truncation patterns like bitwise integer checks, `parseInt(value, 10) === value`, and `Math.round(value) === value`.

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
const largeNumber = 9007199254740992; // 2^53

// ❌
// Different integer literals can round to the same number.
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

```js
// ❌
if (value % 1 === 0) {
	console.log('Integer');
}

// ✅
if (Number.isSafeInteger(value)) {
	console.log('Safe integer');
}
```

```js
// ❌
if (_.isInteger(value)) {
	console.log('Integer');
}

// ✅
if (Number.isSafeInteger(value)) {
	console.log('Safe integer');
}
```
