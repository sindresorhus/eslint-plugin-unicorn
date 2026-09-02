# prefer-explicit-viewport-units

📝 Prefer explicit viewport units.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`vh` and `vw` use the large viewport. On mobile, browser controls can therefore obscure content in a `100vh` layout. This rule makes the intended behavior explicit: dynamic, small, or large viewport units.

This rule checks `100vh` and `100vw` in explicit physical and logical sizing properties, including math functions such as `calc()` and `clamp()`. It ignores custom properties, positioning properties, flex/grid shorthands, and viewport units in media and feature queries.

It also reports legacy fallback declarations. Disable the specific report when a fallback is required for browsers that do not support the configured unit.

Choose a unit based on the intended design:

- `dvh` / `dvw` fills the visible viewport, but can resize while scrolling.
- `svh` / `svw` keeps content clear of browser controls, but can leave unused space.
- `lvh` / `lvw` fills the largest viewport, but content can be obscured by browser controls.

## Examples

```css
/* ❌ */
.hero {
	min-height: 100vh;
}

/* ✅ */
.hero {
	min-height: 100dvh;
}
```

## Options

### unit

Type: `'dvh' | 'svh' | 'lvh'`\
Default: `'dvh'`

Set the preferred viewport-height unit. The matching viewport-width unit is selected automatically.

```js
// eslint unicorn/prefer-explicit-viewport-units: ["error", {unit: "svh"}]
```

```css
/* ❌ */
.dialog {
	max-height: 100vh;
	width: 100vw;
}

/* ✅ */
.dialog {
	max-height: 100svh;
	width: 100svw;
}
```
