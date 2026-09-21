# no-redundant-longhand-properties

📝 Disallow longhand properties that can be combined into a shorthand.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports longhands that can be combined into one shorthand. It pairs with [`no-shorthand-property-overrides`](./no-shorthand-property-overrides.md), which catches shorthands that override earlier longhands.

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

The rule skips invalid values, duplicate longhands, mixed `!important` declarations, and values containing `var()` or similar functions. It also skips some ambiguous or inconsistently supported animation, font, column, and list-style values.

Comma-separated values can repeat across shorthand layers, but lists longer than the primary list are skipped. If a shorthand would also reset another property, such as `border-image`, the rule only reports when it can verify that reset is safe.

Autofix requires contiguous declarations with no comments in the replaced text. Otherwise, the rule reports without fixing. It preserves explicit `background-blend-mode` declarations to account for browser differences.

Nested rules and vendor-prefixed declarations split groups. Descriptor blocks such as `@font-face` and vendor-prefixed groups are ignored.

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
					ignoreShorthands: [
						'transition',
						'font',
					],
				},
			],
		},
	},
];
```
