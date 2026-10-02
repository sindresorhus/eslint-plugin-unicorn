# no-conflicting-constraints

📝 Disallow conflicting CSS query and HTML form constraints.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Report conflicting explicit bounds in CSS queries and HTML form controls, including JSX/TSX. No fixes or suggestions are provided because the intended bounds cannot be inferred.

## Examples

### CSS queries

Checks flat `and` conditions in `@media`, `@import`, and `@container`. Supports `min-`/`max-`, colon equality, and comparisons or chained ranges in either direction. Equal bounds conflict only when either comparison is strict.

```css
/* ❌ */
@media (width > 1000px) and (width < 500px) {}

/* ✅ */
@media (width > 1000px), (width < 500px) {}
```

```css
/* ❌ */
@media (1000px < width < 500px) {}

/* ✅ */
@media (500px < width < 1000px) {}
```

```css
/* ❌ */
@container card (inline-size > 1000px) and (inline-size < 500px) {}

/* ✅ */
@container card (500px < inline-size < 1000px) {}
```

Supported features:

- Media: `width`, `height`, `device-width`, `device-height`, `resolution`, `color`, `color-index`, `monochrome`, `horizontal-viewport-segments`, `vertical-viewport-segments`.
- Container: `width`, `height`, `inline-size`, `block-size`.

Only valid finite numeric literals with matching units are compared. Comma-separated media queries and distinct feature/unit pairs are checked independently.

Negation, `or`, grouped conditions, functions, ratios, keywords, unknown/vendor features, and custom media are ignored. Container conditions containing function queries are skipped entirely. The rule does not combine enclosing queries, infer domains or integer gaps, convert units, or equate unitless zero with a dimension. Extreme numeric precision is unsupported. Use colon equality: range `=` syntax currently fails parsing.

### HTML form controls

Checks:

- `min` and `max` on `input` elements with type `number` or `range`.
- `minlength` and `maxlength` on textareas and inputs with type `text`, `search`, `url`, `tel`, `email`, or `password`. Missing or empty input type defaults to `text`.

```html
<!-- ❌ -->
<input type="number" min="10" max="5">

<!-- ✅ -->
<input type="number" min="5" max="10">
```

```html
<!-- ❌ -->
<textarea minlength="10" maxlength="5"></textarea>

<!-- ✅ -->
<textarea minlength="5" maxlength="10"></textarea>
```

Valid explicit values are compared, including character references and unquoted values. Date/time inputs, implicit defaults, `step`, and `pattern` are ignored. Time ranges may cross midnight. Disabled, readonly, and optional controls are checked, though an empty optional control can remain valid.

Templated values are ignored; templated attribute names skip the whole element. Checks depending on duplicate attributes are skipped in HTML and JSX. Markup-like text inside `textarea`, `title`, or `iframe` is ignored. Quote values containing slashes: the HTML parser can otherwise absorb subsequent attributes.

### JSX and TSX

Checks native `input` and `textarea` elements, using `minLength`/`maxLength` for lengths. Supports literal strings/numbers and safe static expressions, including preceding constants. TypeScript type information is not required.

```jsx
// ❌
const minimum = 10;
<input type="number" min={minimum} max={5} />;

// ✅
<input type="number" min={5} max={minimum} />;
```

Custom components, spreads, dynamic bounds/types, mutable bindings, and forward references are ignored. Embedded CSS strings and framework templates are not inspected.

## Related rules

[`no-invalid-media-features`](./no-invalid-media-features.md) and HTML ESLint's [`no-invalid-attr-value`](https://html-eslint.org/docs/rules/no-invalid-attr-value) validate individual values. [`prefer-media-feature-range-syntax`](./prefer-media-feature-range-syntax.md) checks notation; HTML ESLint's `no-ineffective-attrs` checks applicability. None checks relationships between bounds.
