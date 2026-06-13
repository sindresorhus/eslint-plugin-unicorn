# prefer-string-trim-start-end

📝 Prefer `String#trimStart()` / `String#trimEnd()` over `String#trimLeft()` / `String#trimRight()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`String#trimLeft()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trimLeft) and [`String#trimRight()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trimRight) are deprecated aliases for [`String#trimStart()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trimStart) and [`String#trimEnd()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trimEnd). The newer names use direction-independent wording that works correctly with both left-to-right and right-to-left languages.

## Examples

```js
// ❌ - Deprecated names
const name = '  John  '.trimLeft();

// ✅ - Preferred method
const name = '  John  '.trimStart();
```

```js
// ❌
const value = text.trimRight();

// ✅
const value = text.trimEnd();
```

```js
// ✅ - All three do the same thing
const str = '  hello world  ';
str.trim();      // Remove from both sides
str.trimStart(); // Remove from beginning
str.trimEnd();   // Remove from end
```

## Why direction-independent naming?

`trimStart()` and `trimEnd()` are more appropriate for international text, as "left" and "right" don't make sense in right-to-left languages like Arabic or Hebrew.
