# no-zero-length-unit

📝 Disallow units on zero CSS lengths.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

In most contexts, zero CSS lengths do not need a unit. Use `0` instead of `0px`, `0rem`, or another zero length.

The rule checks lengths in declarations and media and container queries when it can validate their context. It skips unresolved values, such as `translate(0px, var(--space))`, and ignores angles, times, percentages, `fr`, unknown or escaped units, custom and vendor-prefixed properties and functions, and math functions such as `calc()`, where units may be required.

It also ignores properties that accept both lengths and unitless numeric values, including `line-height`, `columns`, and the `flex` shorthand, and registered custom property `initial-value` descriptors. Removing units in those contexts can change the value's meaning.

Use this rule with [`no-zero-fractions`](./no-zero-fractions.md) to turn `0.0px` into `0`.

## Examples

```css
/* ❌ */
.item {
	margin: 0px;
	transform: translateX(0rem);
}

/* ✅ */
.item {
	margin: 0;
	transform: translateX(0);
}

/* ✅ */
.item {
	transition-duration: 0s;
	width: calc(0px + 1px);
	flex: 0px;
}
```
