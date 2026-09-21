# no-unknown-animations

📝 Disallow unknown animations.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Checks names in `animation` and `animation-name` against `@keyframes` in the same file. An unmatched name silently prevents the animation from running.

## Examples

```css
/* ❌ */
.button {
	animation: fade-in 300ms ease;
}

@keyframes fade-out {
	to {
		opacity: 0;
	}
}
```

```css
/* ✅ */
.button {
	animation: fade-in 300ms ease;
}

@keyframes fade-in {
	to {
		opacity: 1;
	}
}
```

Names are case-sensitive. Where both forms are valid, quoted and unquoted names match; CSS escapes are decoded. Reserved names such as `none`, `default`, and CSS-wide keywords must be quoted.

The rule recognizes `@keyframes` and its `-webkit-`, `-moz-`, and `-o-` variants, but ignores vendor-prefixed animation properties.

Names inside functions such as `var()`, including fallbacks, are ignored; unambiguous static names outside them are checked.

Ambiguous shorthands such as `animation: backwards none --fade` may be missed when the CSS lexer interprets `none` as the name and `--fade` as the timeline.

Leave the rule disabled when keyframes are defined in another stylesheet.
