# prefer-short-hex-color

📝 Prefer short hexadecimal color notation.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Hexadecimal colors can use three or four digits when each adjacent pair in a six or eight digit value represents the same digit, regardless of letter case. This rule shortens those values without changing their color.

It checks hash tokens in declaration values, including custom properties and unknown value syntax. It leaves selectors, strings, comments, and URLs unchanged. The fix preserves the case of the retained digits; use [`lowercase-css`](./lowercase-css.md) to enforce lowercase.

## Examples

```css
/* ❌ */
a {
	color: #ffffff;
	background-color: #aabbccdd;
}
```

```css
/* ✅ */
a {
	color: #fff;
	background-color: #abcd;
}
```
