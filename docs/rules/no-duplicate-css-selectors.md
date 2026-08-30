# no-duplicate-css-selectors

📝 Disallow duplicate CSS selectors.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): 🎨 `css/recommended`, 🖌️ `css/unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Duplicate selector blocks often come from merges, copying, or incomplete refactors. They split related declarations across a stylesheet, and later declarations can unexpectedly override earlier ones.

This rule reports duplicate selectors within a selector list and duplicate selector lists in the same at-rule and nesting context. Insignificant selector whitespace and comments are ignored when comparing selectors.

Keyframe selectors are ignored. Use [`css/no-duplicate-keyframe-selectors`](https://github.com/eslint/css/blob/main/docs/rules/no-duplicate-keyframe-selectors.md) to check them.

## Examples

```css
/* ❌ */
.card {
	color: red;
}

.card {
	color: blue;
}
```

```css
/* ❌ */
.button,
.button {
	padding: 8px;
}
```

Selectors in matching conditional contexts are compared even when the conditional blocks are separate:

```css
/* ❌ */
@media (width > 40rem) {
	.card {
		color: red;
	}
}

@media (width > 40rem) {
	.card {
		color: blue;
	}
}
```

Selectors in different contexts are allowed:

```css
/* ✅ */
@media (width > 40rem) {
	.card {
		color: red;
	}
}

@media (width > 60rem) {
	.card {
		color: blue;
	}
}
```

The rule compares complete selector lists in their original order. It does not report partially overlapping lists, reordered lists, or selectors that become equivalent only after resolving CSS nesting.

```css
/* ✅ */
.card,
.featured {}

.card {}

/* ✅ */
.card,
.featured {}

.featured,
.card {}

/* ✅ */
.parent .child {}

.parent {
	& .child {}
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
		},
		language: 'css/css',
		extends: [
			unicorn.configs['css/recommended'],
		],
	},
]);
```
