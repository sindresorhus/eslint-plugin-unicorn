# prefer-single-replace

📝 Enforce combining multiple single-character replacements into a single `String#replaceAll()` with a regular expression.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

A chain of replacements that each swap a single character for the same string scans the whole string once per call. When the replacements are global and share the same result, they can be combined into a single pass using a [regular expression character class](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Character_classes), which is both faster and clearer.

Only global replacements are handled: [`String#replaceAll()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replaceAll) with a single-character string, and `String#replace()`/`String#replaceAll()` with a regex matching one literal character and the global flag. Plain `String#replace('a', …)` is left alone because it only replaces the first occurrence, so it has no character-class equivalent.

## Examples

```js
// ❌
const slug = string.replaceAll('a', '-').replaceAll('b', '-').replaceAll('c', '-');

// ✅
const slug = string.replaceAll(/[abc]/g, '-');
```

```js
// ❌
const cleaned = string.replace(/a/g, '_').replaceAll('b', '_');

// ✅
const cleaned = string.replaceAll(/[ab]/g, '_');
```
