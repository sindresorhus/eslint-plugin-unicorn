# prefer-string-slice

📝 Prefer `String#slice()` over `String#substr()` and `String#substring()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`String#substr()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substr) is deprecated. [`String#substring()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substring) has [confusing behavior](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substring#differences_between_substring_and_slice) with negative indices and swaps arguments when the first is greater than the second. [`String#slice()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/slice) is the better choice: it handles negative indices intuitively and behaves consistently with [`Array#slice()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice).

This rule intentionally leaves supported one-character `substring()` patterns to [`unicorn/prefer-at`](./prefer-at.md), so enable both rules to catch both general string slicing and single-character access patterns.

## Examples

```js
const str = 'hello world';

// ❌
str.substr(0, 5);

// ✅
str.slice(0, 5);
// → 'hello'
```

```js
const str = 'hello world';

// ❌
str.substring(6, 11);

// ✅
str.slice(6, 11);
// → 'world'
```

```js
const str = 'hello world';

// ❌ substring swaps arguments when start > end
str.substring(5, 0);
// → 'hello' (confusing!)

// ✅ slice handles it intuitively
str.slice(5, 0);
// → '' (empty, as expected)

// ✅ slice handles negative indices
str.slice(-5);
// → 'world' (last 5 characters)
```
