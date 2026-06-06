# require-css-escape

📝 Require `CSS.escape()` for interpolated values in CSS selectors.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When interpolating arbitrary values into CSS selectors, use [`CSS.escape()`](https://developer.mozilla.org/en-US/docs/Web/API/CSS/escape_static) to make sure the resulting selector remains valid.

By default, this rule only checks interpolations inside attribute selectors to avoid noisy reports for common class and ID selector patterns.

## Examples

```js
// ❌
document.querySelector(`[data-id="${id}"]`);

// ✅
document.querySelector(`[data-id="${CSS.escape(id)}"]`);
```

```js
// ❌
element.querySelectorAll(`a[href^="#${hash}"]`);

// ✅
element.querySelectorAll(`a[href^="#${CSS.escape(hash)}"]`);
```

```js
// ✅
document.querySelector(cssEscape`#${id}`);
```

## Options

### `checkAllSelectors`

Type: `boolean`\
Default: `false`

When set to `true`, checks all selector interpolations instead of only interpolations inside attribute selectors.

```js
// eslint unicorn/require-css-escape: ["error", {"checkAllSelectors": true}]

// ❌
document.querySelector(`#${id}`);

// ✅
document.querySelector(`#${CSS.escape(id)}`);
```
