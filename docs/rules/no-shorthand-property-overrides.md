# no-shorthand-property-overrides

📝 Disallow shorthand properties that override related longhand properties.

💼🚫 This rule is enabled in the 🎨 `recommended-css` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

CSS shorthands reset every related longhand that they omit. Placing a shorthand after a longhand in the same declaration block is therefore usually an accidental reset.

This rule checks declarations only within the same block. It supports matching vendor-prefixed properties and intentionally ignores CSS-escaped property names.

A normal shorthand after an `!important` longhand is not reported, because the `!important` declaration wins whatever the source order is.

An `!important` shorthand also makes all of its related longhands important. A later normal declaration does not remove that protection.

The rule includes properties reset indirectly by a shorthand, such as `border-image` by `border`, `mask-border` by `mask`, and animation ranges by `animation`. It also checks modern longhands such as `animation-timeline`, `transition-behavior`, `font-synthesis-position`, and `column-height`. The `grid` shorthand does not reset gap properties, so those combinations are allowed.

This rule does not provide an autofix or editor suggestion because the intended styling is ambiguous. Move the shorthand before the longhand if the longhand should win, include the intended value in the shorthand where possible, or remove the earlier declaration if the override is intentional.

Related rules check different patterns: [`no-duplicate-properties`](./no-duplicate-properties.md) checks repeated property names, [`no-redundant-longhand-properties`](./no-redundant-longhand-properties.md) combines longhands into shorthands, and [`no-redundant-shorthand-values`](./no-redundant-shorthand-values.md) removes repeated shorthand values.

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

```css
/* ❌ */
.image {
	background-repeat: no-repeat;
	background: url(image.png);
}

.animation {
	animation-timeline: --scroll;
	animation-range-start: 10%;
	animation: fade 1s;
}

/* ✅ */
.image {
	background: url(image.png);
	background-repeat: no-repeat;
}

.animation {
	animation: fade 1s;
	animation-timeline: --scroll;
	animation-range-start: 10%;
}
```

```css
/* ✅ */
.spacing {
	padding: 1px !important;
	padding-left: 2px;
	padding: 3px;
}
```

The effective `padding-left` in this example remains `1px`, because the first shorthand made it important.

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
