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

The rule checks parsed CSS declaration values, including custom properties and declarations inside `@supports`. It does not inspect strings, URLs, CSS-in-JS, or preprocessor syntax. Raw `var()` fallback text in ordinary declarations is skipped; fallback colors in custom properties can be parsed and checked. Color functions with comments, ambiguous comma-separated components, or legacy arguments that cannot be validated are reported without an autofix. This includes comma-separated colors with `var()` components or math functions in color channels: modern syntax may accept values invalid in legacy syntax. Scientific-notation alpha literals are reported but not converted automatically; other parts of the same color function may still be fixed.

Modern media feature ranges, viewport units, casing, and formally deprecated CSS features are handled by their existing Unicorn rules.
