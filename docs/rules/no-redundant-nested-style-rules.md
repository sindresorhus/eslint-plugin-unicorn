# no-redundant-nested-style-rules

📝 Disallow nested style rules that do not modify the parent selector.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

An `&` selector by itself selects the same elements as its parent style rule, so the extra nested block is unnecessary. Flattening the declarations makes the stylesheet easier to read.

The rule only reports cases that can be safely flattened. The parent style rule must have one selector and must not select a pseudo-element. These restrictions avoid changing [CSS nesting specificity](https://www.w3.org/TR/css-nesting-1/#nest-selector) or applying declarations to pseudo-elements that `&` cannot represent. An intervening `@scope` rule is also ignored because it gives `&` different semantics.

Nested group rules such as `@media` may appear between the parent style rule and the redundant `&` block.

## Examples

```css
/* ❌ */
.button {
	& {
		color: red;
	}
}

/* ✅ */
.button {
	color: red;
}
```

```css
/* ❌ */
.button {
	@media (width > 30rem) {
		& {
			color: red;
		}
	}
}

/* ✅ */
.button {
	@media (width > 30rem) {
		color: red;
	}
}
```

Selectors that modify the parent selector are allowed:

```css
.button {
	&:hover {
		color: red;
	}
}
```
