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

The rule follows CSS specificity rules, ignores direct pseudo-element branches because `&` cannot represent them, and carries nesting through `@media`, `@supports`, `@container`, and `@layer`. `@scope` and other at-rules are boundaries. Contextual validity inside functional pseudo-classes is not analyzed, and nested `@supports` or `@container` rules cannot be checked while `@eslint/css` exposes their contents as raw text.

This rule has no fixer because splitting or changing selectors requires knowledge of the intended document structure and cascade.
