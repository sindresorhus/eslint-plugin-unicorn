# no-nesting-with-mixed-specificity

📝 Disallow nesting under selector lists with mixed specificity.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

CSS gives the nesting selector (`&`) the specificity of the most specific selector in its parent selector list, matching the behavior of `:is()`. Mixing selector specificities can therefore make a nested rule more specific than one of its matching parent branches suggests.

## Examples

```css
/* ❌ */
#dialog,
.dialog {
	& .close {}
}
```

The nested selector behaves like `:is(#dialog, .dialog) .close`, so both branches have the ID specificity from `#dialog`.

Split the parent rule:

```css
/* ✅ */
#dialog {
	& .close {}
}

.dialog {
	& .close {}
}
```

Selector lists whose entries have equal specificity are allowed:

```css
/* ✅ */
.dialog,
.modal {
	& .close {}
}
```

Equalizing the parent selectors' specificity is therefore another possible remediation.

The rule calculates effective specificity according to the CSS selector rules, including the special behavior of `:is()`, `:not()`, `:has()`, `:where()`, `:nth-child()`, `:nth-last-child()`, `:host()`, `:host-context()`, `::slotted()`, and named view-transition pseudo-elements. A named view-transition pseudo-element with only `*` as its argument has zero specificity, while a custom identifier or view-transition class has type-selector specificity. Nesting through `@media`, `@supports`, `@container`, and `@layer` remains associated with the nearest parent style rule. An `@scope` rule establishes a boundary instead. The current `@eslint/css` parser exposes the contents of `@supports`, `@container`, and `@scope` as raw text when the at-rule is itself nested inside a style rule, so those cases will be checked once the parser exposes their nested AST nodes.

This rule has no fixer because splitting or changing selectors requires knowledge of the intended document structure and cascade.
