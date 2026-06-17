# no-accidental-bitwise-operator

📝 Disallow bitwise operators where a logical operator was likely intended.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Bitwise operators (`&`, `|`, `|=`) are rarely used in everyday code, and when they show up in boolean-like contexts they are almost always a typo for the logical operators (`&&`, `||`, `||=`).

The bug is easy to miss and hard to debug:

- Bitwise operators do not [short-circuit](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_AND#short-circuit_evaluation), so `if (object & object.property)` evaluates `object.property` even when `object` is `null` or `undefined`, throwing a `TypeError`.
- `options | {}` coerces both sides to integers, silently producing `options | 0` instead of falling back to the default object.

This rule only targets the high-signal patterns where a logical operator was clearly intended, so it does not flag legitimate bitwise math like `flags & MASK` or `value | 0`. Because switching the operator changes runtime behavior, the fix is offered as a suggestion rather than applied automatically.

This is more targeted than the built-in [`no-bitwise`](https://eslint.org/docs/latest/rules/no-bitwise) rule, which disallows all bitwise operators. See also [`prefer-math-trunc`](./prefer-math-trunc.md), which covers the `value | 0` truncation idiom.

## Examples

```js
// ❌
if (object & object.property) {
	// …
}

// ✅
if (object && object.property) {
	// …
}
```

```js
// ❌
options = options | {};

// ✅
options = options || {};
```

```js
// ❌
input |= '';

// ✅
input ||= '';
```

```js
// ✅ Not flagged: legitimate bitwise math
const masked = flags & MASK;
const truncated = value | 0;
```
