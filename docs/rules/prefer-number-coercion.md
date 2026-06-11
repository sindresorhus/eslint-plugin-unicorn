# prefer-number-coercion

📝 Prefer `Number()` over `parseFloat()` and base-10 `parseInt()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`parseFloat()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseFloat) and [`parseInt()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt) parse the longest valid numeric prefix and ignore trailing invalid text. [`Number()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number) parses the whole value, so it better matches code that expects a stringified number.

This rule does not report `parseInt(value)` without a radix. Use ESLint's [`radix`](https://eslint.org/docs/latest/rules/radix) rule if you want to require explicit radices.

## Examples

```js
// ❌
const number = parseFloat(value);

// ✅
const number = Number(value);
```

```js
// ❌
const number = Number.parseFloat(value);

// ✅
const number = Number(value);
```

```js
// ❌
const integer = parseInt(value, 10);

// ✅
const integer = Math.trunc(Number(value));
```

```js
// ❌
const integer = Number.parseInt(value, 10);

// ✅
const integer = Math.trunc(Number(value));
```

```js
// ✅
const integer = parseInt(value);
```

```js
// ✅
const integer = Number.parseInt(value, 16);
```
