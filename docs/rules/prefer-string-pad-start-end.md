# prefer-string-pad-start-end

📝 Prefer `String#padStart()` and `String#padEnd()` over manual string padding.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Manual string padding using [`String#repeat()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat) is less clear and can throw a `RangeError` when the string is already longer than the target length. [`String#padStart()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart) and [`String#padEnd()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd) express the intent directly and return the original string when no padding is needed.

This rule only reports static one-code-unit padding strings. Multi-character padding is ignored because `repeat()` concatenation and `padStart()` / `padEnd()` truncation are not equivalent.

## Examples

```js
// ❌
const foo = '*'.repeat(10 - bar.length) + bar;

// ✅
const foo = bar.padStart(10, '*');
```

```js
// ❌
const foo = bar + '*'.repeat(10 - bar.length);

// ✅
const foo = bar.padEnd(10, '*');
```

The following patterns are reported with suggestions only, because they truncate strings that are already longer than the target length:

```js
// ❌
const foo = ('*'.repeat(10) + bar).slice(-10);

// 💡
const foo = bar.padStart(10, '*');
```

```js
// ❌
const foo = (bar + '*'.repeat(10)).slice(0, 10);

// 💡
const foo = bar.padEnd(10, '*');
```
