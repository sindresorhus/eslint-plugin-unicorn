# prefer-explicit-viewport-units

📝 Prefer explicit viewport units.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Default viewport units such as `vh` and `vw` currently use the large viewport. Use an explicit small, large, or dynamic viewport unit when a full-size layout needs a particular behavior as browser controls show or hide.

This rule only checks `100vh` and `100vw` in explicit physical and logical sizing properties. It also checks those values in math functions such as `calc()` and `clamp()`. It does not check custom properties, positioning properties, flex/grid shorthands, or viewport units in media and feature queries.

The rule also reports legacy fallback declarations. Disable the specific report when a fallback is required for browsers that do not support the configured unit.

Choose a unit based on the intended design:

- `dvh` / `dvw` fills the currently visible viewport, but can resize while the user scrolls.
- `svh` / `svw` keeps content clear of browser controls, but can leave unused space after they retract.
- `lvh` / `lvw` fills the largest viewport, but content can be obscured while controls are visible.

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
