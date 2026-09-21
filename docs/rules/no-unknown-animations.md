# no-unknown-animations

📝 Disallow unknown animations.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

An animation name that does not match a `@keyframes` rule silently prevents the animation from running. This rule checks names used by the `animation` and `animation-name` properties against `@keyframes` rules in the same file.

## Examples

```css
/* ❌ */
.button {
	animation: fade-in 300ms ease;
}

@keyframes fade-out {
	to { opacity: 0; }
}
```

```css
/* ✅ */
.button {
	animation: fade-in 300ms ease;
}

@keyframes fade-in {
	to { opacity: 1; }
}
```

Animation names are case-sensitive. When both syntaxes are valid, quoted and unquoted names are equivalent, and CSS escapes are decoded before comparison. Reserved names such as `none` and CSS-wide keywords must be quoted.

The rule recognizes `@keyframes`, `@-webkit-keyframes`, `@-moz-keyframes`, and `@-o-keyframes`, but it only checks the standard `animation` and `animation-name` properties.

Dynamic names inside functions such as `var()` are ignored, including fallback values. Statically unambiguous names outside those functions are still checked. For example, `fade-in` is checked in `animation: fade-in var(--duration)`, but `fallback` is ignored in `animation-name: var(--name, fallback)`.

The rule only considers keyframes defined in the same file. Leave it disabled for files that use keyframes from another stylesheet.
