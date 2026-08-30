# no-unscoped-css-nesting-selector

📝 Disallow unscoped CSS nesting selectors.

💼🚫 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): 🎨✅ `css/recommended`, 🎨☑️ `css/unopinionated`. This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The [CSS nesting selector](https://drafts.csswg.org/css-nesting/#nest-selector) (`&`) refers to an ancestor style rule. Outside a nested style rule, it represents the current scoping root and is valid CSS, but this usually means nested CSS was moved without its parent or was otherwise malformed.

This rule reports nesting selectors that do not have an ancestor style rule, `@scope` block, or configured custom scoping root. It does not provide an autofix because removing `&` can change selector matching or specificity, and the intended missing ancestor cannot be inferred.

In an `@scope` prelude, `&` in the scope start needs an outer scoping root, while `&` in the scope limit refers to the new scoping root.

The rule is enabled by the `css/recommended` and `css/unopinionated` configs when either is extended from a CSS language config.

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

At-rule names that provide a scoping root. Names are specified without the leading `@` and are matched ASCII case-insensitively.

The scoping root remains in effect through nested grouping at-rules such as `@media`. Recognized `@keyframes` at-rules stop the search and cannot be configured as scoping roots.

This is useful for CSS extensions such as Tailwind CSS's `@utility` directive:

```js
// eslint.config.js
export default [
	{
		rules: {
			'unicorn/no-unscoped-css-nesting-selector': [
				'error',
				{scopingRootAtRules: ['utility']},
			],
		},
	},
];
```

```css
@utility content-body {
	& p {
		margin-block-end: 1rem;
	}
}
```
