# no-redundant-shorthand-values

📝 Disallow redundant values in CSS shorthand properties.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Some CSS shorthand properties allow repeated values to be omitted without changing the result. Removing those values makes declarations shorter while preserving their meaning.

This rule checks these shorthand families:

- Physical edges: `margin`, `padding`, `border-color`, `border-style`, `border-width`, `scroll-margin`, `scroll-padding`, and `inset`.
- Logical edges: the `-block` and `-inline` variants of those properties.
- Two-value shorthands: `gap`, `grid-gap`, `overflow`, and `overscroll-behavior`.
- Corners: `border-radius`.
- Alignment: `place-content`, `place-items`, and `place-self`.

Four-value edge declarations that could only be reduced to three values are allowed because explicitly naming every edge can be easier to read. For example, `margin: 1px 2px 3px 2px` is allowed. Four-value edge declarations are still reduced when they can use one or two values. This exception does not apply to `border-radius` corner values.

Slash-separated `border-radius` values are shortened independently on each side of the slash. The slash itself is preserved, so `border-radius: 4px / 4px` is allowed.

Declarations containing `var()` are ignored because a custom property may expand to multiple shorthand values. Invalid declarations are also ignored. Functions are compared without evaluating them, and numeric spellings such as `1px` and `1.0px` are kept distinct.

## Examples

```css
/* ❌ */
.button {
	margin: 1px 1px 1px 1px;
	border-radius: 4px 4px 4px 4px;
	place-items: center center;
}

/* ✅ */
.button {
	margin: 1px;
	border-radius: 4px;
	place-items: center;
}
```

```css
/* ✅ */
.button {
	margin: 1px 2px 3px 2px;
	border-radius: 4px / 4px;
	padding: var(--padding) var(--padding);
}
```

## CSS files

Enable it for CSS files with [`@eslint/css`](https://github.com/eslint/css):

```js
import css from '@eslint/css';
import {defineConfig} from 'eslint/config';
import unicorn from 'eslint-plugin-unicorn';

export default defineConfig([
	{
		files: ['**/*.css'],
		plugins: {
			css,
			unicorn,
		},
		language: 'css/css',
		rules: {
			'unicorn/no-redundant-shorthand-values': 'error',
		},
	},
]);
```
