# no-self-referencing-custom-properties

📝 Disallow self-references in CSS custom properties.

🚫 Disabled by default.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

A custom-property declaration such as `--spacing: calc(var(--spacing) + 1px)` creates a cyclic dependency. It does not increment an inherited value, and adding a fallback to `var(--spacing, 1px)` does not repair the cycle. See the [CSS specification](https://www.w3.org/TR/css-variables-1/#cycles).

This rule disallows syntactic self-references, including references inside fallbacks and conditional functions. It reports once per declaration and does not provide an autofix or suggestion because the intended value or variable is unknown.

## Examples

```css
/* ❌ */
.component {
	--spacing: calc(var(--spacing) + 1px);
}

/* ✅ */
.component {
	--spacing: calc(var(--base-spacing) + 1px);
}
```

```css
/* ❌ */
.component {
	--spacing: var(--spacing, 1px);
	--color: var(--theme-color, var(--color));
}

/* ✅ */
.component {
	--spacing: var(--base-spacing, 1px);
	--color: var(--theme-color, black);
}
```

Custom-property names are case-sensitive, so `--spacing: var(--SPACING)` is allowed. The rule ignores strings, comments, URL text, support tests, and container-query conditions. It does not detect indirect cycles such as `--one: var(--two); --two: var(--one)` or extract CSS from JavaScript.

## Limitations

Dynamic property names such as `var(var(--alias))` are not resolved. Literal self-references are reported even in unused fallbacks or conditional branches, so a reported declaration may still be valid under the [current CSS draft](https://drafts.csswg.org/css-variables-2/#using-variables) (see [web-platform tests](https://github.com/web-platform-tests/wpt/blob/master/css/css-variables/variable-cycles.html)).
