# no-duplicate-properties

📝 Disallow duplicate properties within CSS declaration blocks.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Duplicate properties in the same CSS declaration block can override one another or hide editing mistakes.

This rule checks both ordinary and custom properties. Ordinary property names are compared ASCII case-insensitively, while custom property names are case-sensitive. CSS escapes are decoded before comparison.

Every duplicate is reported, even when declarations have different values or units, use vendor-prefixed values, or differ in `!important`. Declarations in keyframes and descriptor blocks such as `@font-face` and `@property` are also checked.

Shorthand and longhand properties are not duplicates. Use [`no-shorthand-property-overrides`](./no-shorthand-property-overrides.md) to check those relationships.

The rule only runs on CSS parsed through `css/css`, including configured custom syntax. It does not inspect JavaScript object properties or JSX props.

The editor suggestion removes the later declaration. It is omitted when removal would also remove a comment or change the scope of an `eslint-disable-next-line` directive.

## Examples

```css
/* ❌ */
.button {
	color: red;
	color: blue;
}
```

```css
/* ❌ */
.component {
	--theme-color: red;
	--theme-color: blue;
}
```

```css
/* ✅ */
.component {
	--theme-color: red;
	--Theme-Color: blue;
}
```

Use [`@supports`](https://developer.mozilla.org/en-US/docs/Web/CSS/@supports) to isolate intentional fallbacks in a separate declaration block:

```css
/* ✅ */
.component {
	color: red;

	@supports (color: oklch(50% 0.2 30)) {
		color: oklch(50% 0.2 30);
	}
}
```

If duplicate declarations are unavoidable, use an ESLint disable comment for that declaration.
