# no-unknown-pseudo-selectors

📝 Disallow unknown pseudo-class and pseudo-element selectors.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): 🎨✅ `css/recommended`, 🎨☑️ `css/unopinionated`, ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Typos in pseudo-classes and pseudo-elements silently create selectors that never match. This rule checks their names and kinds against current CSS specifications, including Editor's Drafts, using [`@webref/css`](https://www.npmjs.com/package/@webref/css) with missing definitions added.

## Examples

```css
/* ❌ */
:foucs {}
::befor {}

/* ✅ */
:focus {}
::before {}
```

Pseudo-class and pseudo-element names are distinct, so `::hover` and `:backdrop` are unknown even though `:hover` and `::backdrop` are standard.

The rule does not validate context or arguments. Nested pseudo-selectors are checked only when `@eslint/css` parses the arguments as selectors.

## Options

### allow

Type: `string[]`\
Default: `[]`

List nonstandard selectors to allow. Each entry must include one or two leading colons to identify its kind. Matching is ASCII case-insensitive and covers both functional and non-functional forms.

Vendor-prefixed and framework-specific selectors must be listed. [CSS custom selectors](https://drafts.csswg.org/css-extensions/#custom-selectors) starting with `--`, such as `:--heading`, are allowed automatically.

```js
{
	allow: [
		':global',
		':deep',
		'::-webkit-slider-thumb',
	],
}
```
