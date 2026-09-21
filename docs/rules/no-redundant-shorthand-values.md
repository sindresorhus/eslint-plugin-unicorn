# no-redundant-shorthand-values

📝 Disallow redundant values in CSS shorthand properties.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Repeated shorthand values can often be omitted without changing the result.

This rule supports:

- Physical edges: `margin`, `padding`, `border-color`, `border-style`, `border-width`, `scroll-margin`, `scroll-padding`, and `inset`.
- Logical edges: the `-block` and `-inline` variants of those properties.
- `gap`, `grid-gap`, `overflow`, `overscroll-behavior`, and `border-radius`.
- `place-content`, `place-items`, and `place-self`.

Four-value edge declarations are not reduced to three because explicitly naming every edge can be easier to read. They are still reduced to one or two values. This exception does not apply to `border-radius`.

Slash-separated `border-radius` values are shortened independently without removing the slash.

Declarations that cannot be validated and declarations containing potentially non-repeatable functions are ignored. This includes `var()`, `attr()`, `env()`, `if()`, `inherit()`, `random()`, `random-item()`, and custom functions such as `--spacing()`. Other functions are compared without evaluation, and numeric spellings such as `1px` and `1.0px` are kept distinct.

The autofix is skipped if it would remove a comment.

## Examples

```css
/* ❌ */
.button {
	margin: 1px 1px 1px 1px;
	border-radius: 4px 4px 4px 4px;
	place-items: center center;
}

/* ✅ */
.button {
	margin: 1px;
	border-radius: 4px;
	place-items: center;
}
```

```css
/* ✅ */
.button {
	margin: 1px 2px 3px 2px;
	border-radius: 4px / 4px;
	padding: var(--padding) var(--padding);
}
```
