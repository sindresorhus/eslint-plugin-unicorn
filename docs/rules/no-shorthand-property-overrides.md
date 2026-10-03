# no-shorthand-property-overrides

📝 Disallow shorthand properties that override related longhand properties.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, 🎨 `recommended-css`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

CSS shorthands reset every related longhand that they omit. Placing a shorthand after a longhand in the same declaration block is therefore usually an accidental reset.

This rule checks declarations only within the same block. It supports matching vendor-prefixed properties and intentionally ignores CSS-escaped property names.

For JavaScript and TypeScript, it checks direct object literals in the `style` prop of intrinsic JSX elements, such as `<div>`. It supports camelCase and quoted CSS property names, matching vendor prefixes, and TypeScript assertions or `satisfies`. Values must be literal strings or numbers; signed numbers and template strings without interpolation are also supported.

Objects with spreads, computed keys, methods, or accessors are ignored. Dynamic, empty, nullish, boolean, and `!important` values are ignored. Style variables, custom component props, and CSS library APIs are not checked.

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

```jsx
// ❌
<div style={{paddingLeft: 10, padding: 20}} />;

// ✅
<div style={{padding: 20, paddingLeft: 10}} />;
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
