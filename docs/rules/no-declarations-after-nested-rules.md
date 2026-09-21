# no-declarations-after-nested-rules

📝 Disallow declarations after nested rules.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule requires declarations to come before nested rules within the same CSS block.

Within style rules and nested group rules, modern browsers preserve source order by wrapping later declarations in an implicit [nested declarations rule](https://www.w3.org/TR/css-nesting-1/#nested-declarations-rule), represented in the CSSOM by [`CSSNestedDeclarations`](https://www.w3.org/TR/css-nesting-1/#cssnesteddeclarations). Older implementations of CSS nesting may instead hoist or skip those declarations, producing different results.

The CSS specification recommends placing declarations before nested rules because the implicit rule is not visible in the source and makes the cascade harder to follow.

## Examples

```css
/* ❌ */
.card {
	&:hover {
		color: red;
	}

	display: block;
}

/* ✅ */
.card {
	display: block;

	&:hover {
		color: red;
	}
}
```

Block at-rules also count as nested rules:

```css
/* ❌ */
.card {
	@media (width > 40rem) {
		display: grid;
	}

	color: black;
}

/* ✅ */
.card {
	color: black;

	@media (width > 40rem) {
		display: grid;
	}
}
```

The same ordering applies to [`@page`](https://www.w3.org/TR/css-page-3/#margin-at-rules) blocks, where page-margin at-rules should follow declarations because legacy clients may not handle later declarations correctly.

Wrapping declarations in an explicit `&` rule is not a general replacement. The nesting selector can change specificity for selector lists and cannot represent pseudo-elements. The [`no-redundant-nested-style-rules`](./no-redundant-nested-style-rules.md) rule may also flatten wrappers that do not change the selector. When both rules are enabled, place ordinary declarations before nested rules.

This rule has no fixer because moving a declaration can change cascade order, while wrapping it in a nested style rule can change which elements it matches.
