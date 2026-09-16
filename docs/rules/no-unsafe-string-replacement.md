# no-unsafe-string-replacement

📝 Disallow non-literal replacement values in `String#replace()` and `String#replaceAll()`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The replacement argument of [`String#replace()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace) and [`String#replaceAll()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replaceAll) is not inserted literally when it is a string. Special replacement patterns like `$&`, `$1`, and `` $` `` are expanded. When the replacement value comes from an expression, this can produce unexpected output or security bugs.

Use a literal string when the replacement is static. Use a replacement function when the replacement is dynamic.

Direct, non-optional calls to [`String#repeat()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat) on string literals and no-substitution template literals whose values do not contain `$` are also allowed. Repetition cannot introduce a replacement pattern when the original string does not contain `$`.

## Examples

```js
// ❌
template.replace('{url}', htmlEscape(url));

// ✅
template.replace('{url}', () => htmlEscape(url));
```

```js
// ❌
template.replaceAll('{url}', htmlEscape(url));

// ✅
template.replaceAll('{url}', () => htmlEscape(url));
```

```js
// ✅
template.replace('{url}', 'https://example.com');
```

```js
// ✅
template.replace('{url}', `https://example.com`);
```

```js
// ✅
text.replaceAll('\t', ' '.repeat(4));
text.replaceAll('\t', '\u00A0'.repeat(4));
```
