# no-unknown-css-annotations

📝 Disallow unknown CSS annotations.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Standard CSS currently defines only the [`!important`](https://drafts.csswg.org/css-cascade/#important) annotation. Unknown annotations are accepted by the parser but invalidate the declaration, so a typo can silently prevent a style from applying.

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

The `important` keyword is ASCII case-insensitive, and CSS identifiers can contain escapes, so spellings such as `!IMPORTANT` and `!\69mportant` are also allowed.

Custom properties are intentionally ignored because their values are opaque and can validly end in `!identifier`.
