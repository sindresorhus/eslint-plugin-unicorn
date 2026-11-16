# no-unsafe-string-replacement

📝 Disallow non-literal replacement values in `String#replace()` and `String#replaceAll()`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The replacement argument of [`String#replace()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace) and [`String#replaceAll()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replaceAll) is not inserted literally when it is a string. Special replacement patterns like `$&`, `$1`, and `` $` `` are expanded. When the replacement value comes from an expression, this can produce unexpected output or security bugs.

Use a literal string when the replacement is static. Use a replacement function when the replacement is dynamic.

The rule recognizes local replacement functions and checks whether TypeScript identifies other values as callable. If the checker cannot determine the type, the rule can infer callbacks from constant aliases and TypeScript or JSDoc annotations. This includes function types and type literals with call signatures. For named interfaces with call signatures, the rule relies on the TypeScript checker.

For a direct variable reference, the syntax fallback requires a binding without reassignments. If another function can write to that binding, the rule checks its declared TypeScript type.

The rule checks string primitives and boxed `String` objects and skips receivers declared as `DOMTokenList`. Without full type information, it also treats `.classList.replace()` as a DOM call when the object could be a DOM node. Other custom `replace()` methods may be reported when the receiver type is unknown.

Direct, non-optional [`.repeat()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat) calls on string or no-substitution template literals without `$` are allowed. The arguments need not be static because only the receiver can introduce replacement patterns.

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
// ❌
text.replaceAll('\t', '$&'.repeat(2));

// ✅
text.replaceAll('\t', ' '.repeat(4));
text.replaceAll('\t', '\u00A0'.repeat(4));
text.replaceAll('\t', ' '.repeat(count));
```
