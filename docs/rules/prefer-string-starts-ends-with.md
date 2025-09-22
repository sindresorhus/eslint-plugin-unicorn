# Prefer `String#startsWith()` & `String#endsWith()` over `RegExp#test()`

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer [`String#startsWith()`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith) and [`String#endsWith()`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith) over using a regex with `/^foo/` or `/foo$/`.

This rule is fixable, unless the matching object is known not a string.

## Examples

```js
// ❌
const foo = /^bar/.test(baz);

// ✅
const foo = baz.startsWith('bar');
```

```js
// ❌
const foo = /bar$/.test(baz);

// ✅
const foo = baz.endsWith('bar');
```

```js
// ✅
const foo = /^bar/i.test(baz);
```
