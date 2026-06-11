# prefer-scoped-selector

📝 Prefer `:scope` when using element query selector methods.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When calling `querySelector()` or `querySelectorAll()` on an element, use `:scope` to make selector matching explicit.

Without `:scope`, browser selector matching can consider ancestors outside the element and only filter the final matched element to the element subtree.

## Examples

```js
// ❌
element.querySelectorAll('.outer .inner');

// ✅
element.querySelectorAll(':scope .outer .inner');
```

```js
// ❌
document.body.querySelectorAll('option');

// ✅
document.body.querySelectorAll(':scope option');
```

```js
// ✅
document.querySelectorAll('.outer .inner');
```

## Limitations

This rule intentionally only checks static string selectors. It does not parse CSS selectors or try to resolve selector variables.

To avoid false positives from a heavy selector parser, any static selector containing `:scope` is accepted.
