# no-unscoped-css-nesting-selector

📝 Disallow unscoped CSS nesting selectors.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The [CSS nesting selector](https://drafts.csswg.org/css-nesting/#nest-selector) (`&`) is valid at the top level, but often indicates misplaced or malformed nested CSS.

This rule reports `&` without an ancestor style rule, `@scope` block, or configured scoping-root at-rule. It cannot be autofixed safely.

In an `@scope` prelude, `&` in the start uses the outer context, while `&` in the limit uses the new scope.

## Examples

```css
/* ❌ */
& .item {
	color: red;
}

/* ✅ */
.list {
	& .item {
		color: red;
	}
}
```

## Options

### scopingRootAtRules

Type: `string[]`\
Default: `[]`

Additional at-rules that provide a scoping root. Names omit `@` and are matched ASCII case-insensitively. The scope continues through grouping at-rules such as `@media`, but stops at `@keyframes`.

This is useful for CSS extensions such as Tailwind CSS's `@utility` directive:

```js
{
	scopingRootAtRules: [
		'utility',
	],
}
```

```css
@utility content-body {
	& p {
		margin-block-end: 1rem;
	}
}
```
