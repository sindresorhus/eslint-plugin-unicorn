# no-transition-all

📝 Disallow `all` as a transition property.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Using `all` can transition properties added or changed later, making transitions less predictable and potentially less efficient. List the properties that should transition instead.

## Examples

```css
/* ❌ */
.button {
	transition: all 150ms;
}

/* ✅ */
.button {
	transition: opacity 150ms, transform 150ms;
}
```

```css
/* ❌ */
.button {
	transition-property: opacity, all;
}

/* ✅ */
.button {
	transition-property: opacity, color;
}
```

This rule only checks explicit `all` values. It does not infer transition properties from indirect values such as `var(--transition)`, and it allows a shorthand that omits the transition property.

When [type-aware linting](https://typescript-eslint.io/getting-started/typed-linting/) is enabled, it also checks static strings assigned to standard DOM style declaration objects and passed to their `setProperty()` method. It does not check computed properties, dynamic values, JSX, or CSS-in-JS APIs.
