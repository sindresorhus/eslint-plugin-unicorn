# prefer-string-pad-start-end

📝 Prefer `String#padStart()` and `String#padEnd()` over manual string padding.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Manual string padding using [`String#repeat()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat) is less clear and can throw a `RangeError` when the string is already longer than the target length. [`String#padStart()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart) and [`String#padEnd()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd) express the intent directly and return the original string when no padding is needed.

This rule only reports static one-code-unit padding strings. Multi-character padding is ignored because `repeat()` concatenation and `padStart()` / `padEnd()` truncation are not equivalent.

Autofixes and suggestions are only offered when the target length is a numeric literal, the padding is literal, and the padded value is a simple identifier.

## Examples

```js
// ❌ - Manual padding with repeat is error-prone
const formatted = '*'.repeat(10 - name.length) + name;

// ✅ - Clearer intent with padStart
const formatted = name.padStart(10, '*');
```

```js
// ❌
const padded = value + ' '.repeat(5 - value.length);

// ✅
const padded = value.padEnd(5, ' ');
```

```js
// ✅ - Practical example: formatting table data
const col1 = 'ID'.padEnd(10);
const col2 = 'Name'.padEnd(20);
const col3 = 'Value'.padStart(10);

// ✅ - Padding numbers for display
const hours = String(hours).padStart(2, '0');
const minutes = String(minutes).padStart(2, '0');
// → Outputs like "09:45"
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
