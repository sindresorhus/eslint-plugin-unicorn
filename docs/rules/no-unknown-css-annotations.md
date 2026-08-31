# no-unknown-css-annotations

📝 Disallow unknown and noncanonical CSS annotations.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Standard CSS currently defines only the [`!important`](https://drafts.csswg.org/css-cascade/#important) annotation. Unknown annotations are accepted by the parser but invalidate the declaration, so a typo can silently prevent a style from applying.

This rule only allows the canonical `!important` form. Alternative spellings accepted by CSS, including different casing, escapes, whitespace, and comments between `!` and `important`, are disallowed.

## Examples

```css
/* ❌ */
.button {
	color: red !imprtant;
}

/* ✅ */
.button {
	color: red !important;
}
```

Custom properties are intentionally ignored because their values are opaque and can validly end in `!identifier`.
