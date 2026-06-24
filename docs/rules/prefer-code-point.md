# prefer-code-point

📝 Prefer `String#codePointAt(…)` over `String#charCodeAt(…)` and `String.fromCodePoint(…)` over `String.fromCharCode(…)`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`String#codePointAt()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt) and [`String.fromCodePoint()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCodePoint) are superior because they handle full Unicode support, including characters outside the Basic Multilingual Plane (BMP) that require surrogate pairs. The `charCodeAt()` method only returns the code unit, which is insufficient for emoji and other high Unicode characters.

Learn more: [Difference between `String.fromCodePoint()` and `String.fromCharCode()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCodePoint#compared_to_fromcharcode)

## Examples

```js
// ❌ - charCodeAt() returns only the first code unit of the emoji (incorrect)
const unicorn = '🦄'.charCodeAt(0).toString(16);
// → 'd83e' (incorrect)

// ✅ - codePointAt() returns the full code point (correct)
const unicorn = '🦄'.codePointAt(0).toString(16);
// → '1f984' (correct)
```

```js
// ❌ - fromCharCode() fails with high Unicode values
String.fromCharCode(0x1f984);
// → '濾' (wrong character — the code point is truncated to 16 bits)

// ✅ - fromCodePoint() correctly creates characters
String.fromCodePoint(0x1f984);
// → '🦄' (correct)
```

```js
// ❌ - Doesn't work with emoji or high Unicode
const emoji = String.fromCharCode(0x1f60a); // Smiley

// ✅ - Correctly creates emoji
const emoji = String.fromCodePoint(0x1f60a); // Smiley
```

> [!NOTE]
> When the result is used as a number (for example, a string hash, or `charCodeAt(index) - 48` to parse a digit), the rule reports but offers no suggestion, since swapping to `codePointAt()` is not a safe rename there. A correct code-point version must iterate by code point:
>
> ```js
> let hash = 0;
> for (const character of string) {
> 	hash = (((hash * 31) | 0) + character.codePointAt(0)) | 0;
> }
> ```
