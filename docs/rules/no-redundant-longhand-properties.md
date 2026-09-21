# no-redundant-longhand-properties

📝 Disallow longhand properties that can be combined into a shorthand.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports complete groups of longhand CSS properties that can be represented by one shorthand. It complements [`no-shorthand-property-overrides`](./no-shorthand-property-overrides.md), which catches a later shorthand that accidentally overrides an earlier longhand.

## Examples

```css
/* ❌ */
div {
	margin-top: 1px;
	margin-right: 2px;
	margin-bottom: 3px;
	margin-left: 4px;
}

/* ✅ */
div {
	margin: 1px 2px 3px 4px;
}
```

The rule validates both the longhand values and the generated shorthand against the CSS grammar. It does not report groups containing invalid values, mixed `!important` states, duplicate components, or substitution functions such as `var()` and `env()`.

Animation groups with an unquoted `auto`, a dashed name, or an escaped name are not reported because those names can be parsed as an animation timeline in the shorthand.

`list-style-type` values of `inside` or `outside` are not reported because those counter-style names conflict with `list-style-position` values in the shorthand.

For non-CSS-wide values, the rule requires `animation-timeline: auto`, `column-height: auto`, `font-synthesis-position: none`, and `font-variant-emoji: normal` when forming their respective shorthands. Animation groups with `animation-duration: auto` are also skipped. These restrictions avoid shorthand syntax that is not supported consistently across browsers. The generated `animation` and `columns` shorthands omit the corresponding `auto` values.

Shorter comma-separated longhand lists are cycled when required by the CSS grammar. Lists longer than the shorthand's primary list are not reported. Shorthands that reset additional properties, such as `font` and `border`, are only reported when those properties are known to have compatible values, either through explicit CSS-wide keyword declarations or an earlier shorthand that resets them; the autofix generally consumes those declarations too.

The autofix preserves explicit `background-blend-mode` declarations because some browsers do not reset that property when parsing `background`.

The autofix is available when the declarations are contiguous and the replaced source contains no comments. Other safe groups are still reported without a fix.

Nested rules separate groups of declarations because moving values across them can change the cascade.

At-rule descriptor blocks, such as `@font-face`, are ignored because their declarations do not necessarily support the corresponding property shorthand.

Vendor-prefixed groups are not reported. Some prefixed properties are aliases for their unprefixed counterparts, and replacing prefixed longhands with a shorthand can reset additional properties. Any prefixed declaration prevents combining unprefixed declarations across it.

## Options

### `ignoreShorthands`

Type: `string[]`

Default: `[]`

The exact shorthand names to ignore.

```js
export default [
	{
		rules: {
			'unicorn/no-redundant-longhand-properties': [
				'error',
				{
					ignoreShorthands: ['transition', 'font'],
				},
			],
		},
	},
];
```
