# prefer-string-repeat

📝 Prefer `String#repeat()` for repeated whitespace.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Repeated whitespace in string literals and no-substitution template literals is hard to count. Use [`String#repeat()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat) to make the count explicit.

This rule only reports string literals and no-substitution template literals made entirely of the same repeated whitespace character. It does not report repeated words or mixed whitespace.

## Examples

```js
// ❌
const indentation = '    ';

// ✅
const indentation = ' '.repeat(4);
```

```js
// ❌
const padding = '\t\t\t';

// ✅
const padding = '\t'.repeat(3);
```

```js
// ❌
const spaces = '\u2003\u2003\u2003';

// ✅
const spaces = '\u2003'.repeat(3);
```

```js
// ✅
const letters = 'aaa';

// ✅
const words = 'unicorn unicorn unicorn';

// ✅
const mixedWhitespace = ' \t ';
```

## Options

### `minimumRepetitions`

Type: `integer`\
Minimum: `2`\
Default: `3`

The minimum number of repeated whitespace characters before `String#repeat()` is enforced.

```js
/* eslint unicorn/prefer-string-repeat: ["error", {"minimumRepetitions": 2}] */

// ❌
const indentation = '  ';

// ✅
const indentation = ' '.repeat(2);
```
