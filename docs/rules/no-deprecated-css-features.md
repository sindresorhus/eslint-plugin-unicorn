# no-deprecated-css-features

📝 Disallow deprecated CSS features.

💼🚫 This rule is enabled in the ✅ `css/recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule disallows obsolete CSS in one policy. It checks:

- Properties, such as `word-wrap` and `grid-gap`.
- Property value keywords, such as `overflow: overlay` and `word-break: break-word`.
- At-rules, such as `@viewport`.
- Media types, such as `tv` and `projection`.
- Type selectors, pseudo-classes, and pseudo-elements, such as `acronym`, `:matches()`, and `::content`.

The feature list mirrors the curated coverage of Stylelint 17.14.1's [`at-rule-no-deprecated`](https://stylelint.io/user-guide/rules/at-rule-no-deprecated/), [`declaration-property-value-keyword-no-deprecated`](https://stylelint.io/user-guide/rules/declaration-property-value-keyword-no-deprecated/), [`media-type-no-deprecated`](https://stylelint.io/user-guide/rules/media-type-no-deprecated/), [`property-no-deprecated`](https://stylelint.io/user-guide/rules/property-no-deprecated/), and [`selector-no-deprecated`](https://stylelint.io/user-guide/rules/selector-no-deprecated/) rules. Combining them provides one allowlist and consistent diagnostics.

The rule checks declarations inside `@supports`, but does not inspect media feature names, functions, units, JavaScript style APIs, CSS-in-JS, or nonstandard preprocessor syntax. Deprecated keywords inside unknown custom functions are ignored. SVG selector names remain case-sensitive, and `-webkit-box-orient: vertical` is allowed because it is still needed for the widely used line-clamp pattern.

Standards-defined aliases are automatically fixed when the replacement preserves behavior. This includes `word-wrap`, the legacy grid gap properties, page break aliases, `overflow: overlay`, `text-orientation: sideways-right`, and `:matches()`. Other declaration-local replacements are offered as editor suggestions only when the resulting declaration parses successfully. Migrations without a local equivalent, such as `::content` to `::slotted`, are not suggested.

## CSS configuration

Use this rule with [`@eslint/css`](https://github.com/eslint/css):

```js
import css from '@eslint/css';
import {defineConfig} from 'eslint/config';
import unicorn from 'eslint-plugin-unicorn';

export default defineConfig([
	{
		files: ['**/*.css'],
		plugins: {css, unicorn},
		language: 'css/css',
		extends: [
			'css/recommended',
			'unicorn/css/recommended',
		],
	},
]);
```

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

Add an exact canonical feature identifier to allow a deprecated feature. Entries are CSS-like strings, not regular expressions:

```js
// eslint unicorn/no-deprecated-css-features: ["error", {allow: ["word-wrap", "word-break: break-word", "@viewport", "acronym", ":matches", "::content", "@media tv"]}]
```

Use these formats:

- Property: `word-wrap`
- Property and value: `word-break: break-word`
- At-rule: `@viewport`
- Selector: `acronym`, `:matches`, or `::content`
- Media type: `@media tv`
