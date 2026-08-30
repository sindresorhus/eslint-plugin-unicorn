# no-unknown-pseudo-selectors

📝 Disallow unknown pseudo-class and pseudo-element selectors.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Typos in pseudo-classes and pseudo-elements silently create selectors that never match. This rule checks pseudo-selector names against a snapshot of current CSS specifications, including Editor's Drafts, generated from [`@webref/css`](https://www.npmjs.com/package/@webref/css) and supplemented with definitions missing from its data.

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

It validates names and pseudo-selector kinds only. It does not validate where a pseudo-selector may be used or its argument grammar.

## Options

### allow

Type: `string[]`\
Default: `[]`

Add framework-specific, browser-specific, or other intentional extensions. Include one or two leading colons to identify whether each entry is a pseudo-class or pseudo-element. Matching is ASCII case-insensitive, and an entry allows both functional and non-functional uses of the same name.

Vendor-prefixed and framework-specific pseudo-selectors are reported unless explicitly listed in `allow`.

```js
// eslint.config.js
import css from '@eslint/css';
import unicorn from 'eslint-plugin-unicorn';

export default [
	{
		files: ['**/*.css'],
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
