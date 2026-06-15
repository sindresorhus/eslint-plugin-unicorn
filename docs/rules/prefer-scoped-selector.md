# prefer-scoped-selector

📝 Prefer `:scope` when using element query selector methods.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When calling `querySelector()` or `querySelectorAll()` on an element, use `:scope` to make selector matching explicit.

Without `:scope`, browser selector matching can consider ancestors outside the element and only filter the final matched element to the element subtree.

This only matters for selectors with a combinator (descendant `.outer .inner`, child `>`, or sibling `+`/`~`). A simple selector like `.a`, or a list of simple selectors like `.a, b`, is left alone because `:scope` would only add noise.

## Examples

```js
// ❌
element.querySelectorAll('.outer .inner');

// ✅
element.querySelectorAll(':scope .outer .inner');
```

```js
// ✅
element.querySelector('.a, b');
```

```js
// ✅
document.querySelectorAll('.outer .inner');
```

## Limitations

The rule only checks selectors written as a string literal or a template literal without expressions. Dynamic selectors are ignored.

It does not look inside functional pseudo-classes like `:is()`, `:where()`, `:not()`, and `:has()`, so a branch counts as scoped as long as it contains `:scope` somewhere. For example, `:scope div:is(.a, div b)` is accepted even though `div b` is not scoped.
