# no-unnecessary-string-trim

📝 Disallow `String#trim()` before `String#startsWith()` or `String#endsWith()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Use `String#trimStart()` before `String#startsWith()` and `String#trimEnd()` before `String#endsWith()` when the search string cannot observe the opposite side.

This rule does not report `startsWith()` or `endsWith()` calls with a second argument, because the second argument can make the other side of the string observable.

This rule also does not report dynamic search strings, `startsWith()` search strings ending in whitespace, or `endsWith()` search strings starting with whitespace.

## Examples

```js
// ❌
const result = value.trim().startsWith('-');

// ✅
const result = value.trimStart().startsWith('-');
```

```js
// ❌
const result = value.trim().endsWith('-');

// ✅
const result = value.trimEnd().endsWith('-');
```

```js
// ✅
const result = value.trim().startsWith('-', 1);
```

```js
// ✅
const result = value.trim().startsWith('foo ');
```
