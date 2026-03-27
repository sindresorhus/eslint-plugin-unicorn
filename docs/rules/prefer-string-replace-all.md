# prefer-string-replace-all

📝 Prefer `String#replaceAll()` over regex searches with the global flag.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The [`String#replaceAll()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replaceAll) method is both faster and safer as you don't have to use a regex and remember to escape it if the string is not a literal. And when used with a regex, it makes the intent clearer.

## Examples

```js
// ❌
string.replace(/RegExp with global flag/igu, '');

// ✅
string.replaceAll(/RegExp with global flag/igu, '');
```

```js
// ❌
string.replace(/RegExp without special symbols/g, '');

// ✅
string.replaceAll('RegExp without special symbols', '');
```

```js
// ❌
string.replace(/\(It also checks for escaped regex symbols\)/g, '');

// ✅
string.replaceAll('(It also checks for escaped regex symbols)', '');
```

```js
// ❌
string.replace(/Works for u flag too/gu, '');

// ✅
string.replaceAll('Works for u flag too', '');
```

```js
// ❌
string.replaceAll(/foo/g, 'bar');

// ✅
string.replaceAll('foo', 'bar');
```

```js
// ✅
string.replace(/Non-global regexp/iu, '');
```

```js
// ✅
string.replace('Not a regex expression', '')
```

```js
// ✅
string.replaceAll(/\s/g, '');
```
