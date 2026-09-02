# no-deprecated-css-features

📝 Disallow deprecated CSS features.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule disallows deprecated [properties](https://stylelint.io/user-guide/rules/property-no-deprecated/), [property value keywords](https://stylelint.io/user-guide/rules/declaration-property-value-keyword-no-deprecated/), [at-rules](https://stylelint.io/user-guide/rules/at-rule-no-deprecated/), [media types](https://stylelint.io/user-guide/rules/media-type-no-deprecated/), and [selectors](https://stylelint.io/user-guide/rules/selector-no-deprecated/), mirroring Stylelint 17.14.1. Selectors include type selectors, pseudo-classes, and pseudo-elements.

- Declarations inside `@supports` are checked.
- Media feature names, function names, units, JavaScript style APIs, CSS-in-JS, and preprocessor syntax are ignored. Within functions, deprecated system colors are checked only inside recognized color functions.
- SVG type selector names are case-sensitive. `-webkit-box-orient: vertical` is allowed for line clamping.

Safe aliases are automatically fixed: `word-wrap`, legacy grid gap and page break properties, `overflow: overlay`, `text-orientation: sideways-right`, and `:matches()`. Other declaration-local replacements are suggested only when the result parses. Migrations without a local equivalent, such as `::content` to `::slotted`, are not suggested.

## Examples

```css
/* ❌ */
@media tv {
	acronym:matches(.featured) {
		word-wrap: break-word;
		overflow: overlay;
	}
}

/* ✅ */
@media screen {
	abbr:is(.featured) {
		overflow-wrap: break-word;
		overflow: auto;
	}
}
```

## Options

### allow

Type: `string[]`\
Default: `[]`

Allow exact canonical identifiers. Regular expressions are not supported.

```js
'unicorn/no-deprecated-css-features': [
	'error',
	{
		allow: [
			'word-wrap',
			'@viewport',
		],
	},
],
```

Formats:

- Property: `word-wrap`
- Property and value: `word-break: break-word`
- At-rule: `@viewport`
- Selector: `acronym`, `:matches`, or `::content`
- Media type: `@media tv`
