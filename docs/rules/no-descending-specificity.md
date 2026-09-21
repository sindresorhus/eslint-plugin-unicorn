# no-descending-specificity

📝 Disallow lower-specificity selectors from following higher-specificity selectors that set the same property.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Selectors are compared only when they set the same property, share a terminal compound (ignoring pseudo-classes), and the later selector is a single compound. Thus `a:hover` can be compared with `a`, but `a.foo` and `a::before` remain distinct.

## Examples

```css
/* ❌ */
#navigation a {
	color: red;
}

a {
	color: blue;
}
```

```css
/* ✅ */
a {
	color: blue;
}

#navigation a {
	color: red;
}
```

The rule compares exact properties within the same at-rule context and uses the highest parent specificity for nested `&`. A later `!important` declaration overrides an earlier normal one; other importance combinations are compared. Ambiguous selectors and many complex later selectors are skipped to avoid false positives. Only standard CSS parsed by `@eslint/css` is supported; there is no fixer.

For related checks, see [`no-nesting-with-mixed-specificity`](./no-nesting-with-mixed-specificity.md) and [`no-duplicate-css-selectors`](./no-duplicate-css-selectors.md).
