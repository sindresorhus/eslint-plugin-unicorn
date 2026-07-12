# no-shorthand-property-overrides

📝 Disallow shorthand properties that override related longhand properties.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

CSS shorthands reset every related longhand that they omit. Placing a shorthand after a longhand in the same declaration block is therefore usually an accidental reset.

This rule checks declarations only within the same block. It supports matching vendor-prefixed properties and intentionally ignores CSS-escaped property names.

## Examples

```css
/* ❌ */
button {
	padding-left: 10px;
	padding: 20px;
}

/* ✅ */
button {
	padding: 20px;
	padding-left: 10px;
}
```

```css
/* ✅ */
a {
	padding-left: 10px;
}

b {
	padding: 20px;
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
			'unicorn/no-shorthand-property-overrides': 'error',
		},
	},
]);
```
