# prefer-modern-css-syntax

📝 Prefer modern CSS color and pseudo-element syntax.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[CSS Color 4](https://drafts.csswg.org/css-color/#color-functions) defines space-separated color components with an optional slash-separated alpha channel. The `rgba()` and `hsla()` names are aliases of `rgb()` and `hsl()`. This rule prefers `rgb()` and `hsl()`, modern separators, and percentage notation for direct numeric alpha values.

[Selectors Level 4](https://drafts.csswg.org/selectors/#pseudo-element-syntax) uses two colons for pseudo-elements. This rule changes the four legacy single-colon forms: `:before`, `:after`, `:first-line`, and `:first-letter`.

## Examples

```css
/* ❌ */
a:before {
	color: rgba(0, 0, 0, .5);
	background: linear-gradient(hsla(30, 40%, 50%, .25), white);
	--brand: rgb(20, 40, 60);
}
```

```css
/* ✅ */
a::before {
	color: rgb(0 0 0 / 50%);
	background: linear-gradient(hsl(30 40% 50% / 25%), white);
	--brand: rgb(20 40 60);
}
```

The alpha convention also applies to direct numeric alpha values in `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, and `color()`. Values in `opacity` and computed alpha expressions such as `calc()` or `var()` are unchanged.

Percentage alpha is a style preference; numeric alpha is also valid in modern syntax.

The rule checks parsed CSS declaration values, including custom properties and declarations inside `@supports`.

## Limitations

- Strings, URLs, CSS-in-JS, and preprocessor syntax are not inspected.
- `var()` fallback colors are checked only in custom properties; elsewhere, the parser leaves them unparsed.
- Color functions with comments are reported without an autofix.
- Ambiguous or invalid legacy arguments, including `var()` or math color channels, are reported without an autofix to preserve validity.
- Scientific-notation alpha is reported without conversion; other parts of the function may still be fixed.

For example:

```css
a {
	/* Fallback color is skipped. */
	color: var(--brand, rgba(0, 0, 0, .5));
	/* Fallback color is checked and can be fixed. */
	--brand: var(--fallback, rgba(0, 0, 0, .5));
}
```
