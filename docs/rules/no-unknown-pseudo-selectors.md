# no-unknown-pseudo-selectors

📝 Disallow unknown pseudo-class and pseudo-element selectors.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Typos in pseudo-classes and pseudo-elements silently create selectors that never match. This rule checks pseudo-selector names against the latest CSS specifications, including Editor's Drafts, using data from [`@webref/css`](https://www.npmjs.com/package/@webref/css).

## Examples

```css
/* ❌ */
:foucs {}
::befor {}

/* ✅ */
:focus {}
::before {}
```

The rule distinguishes pseudo-classes from pseudo-elements, so `::hover` and `:backdrop` are unknown even though `:hover` and `::backdrop` are standard.

It validates names only. It does not validate where a pseudo-selector may be used or the contents of a functional pseudo-selector.

## Options

### allow

Type: `string[]`\
Default: `[]`

Add framework-specific, browser-specific, or other intentional extensions. Include one or two leading colons to identify whether each entry is a pseudo-class or pseudo-element. Matching is case-insensitive, and an entry allows both functional and non-functional uses of the same name.

```js
// eslint.config.js
import css from '@eslint/css';
import unicorn from 'eslint-plugin-unicorn';

export default [
	{
		plugins: {css, unicorn},
		language: 'css/css',
		rules: {
			'unicorn/no-unknown-pseudo-selectors': [
				'error',
				{allow: [':global', ':deep', '::-webkit-slider-thumb']},
			],
		},
	},
];
```

With this configuration:

```css
/* ✅ */
:global(.button) {}
:deep(.icon) {}
::-webkit-slider-thumb {}
```
