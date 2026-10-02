# no-conflicting-constraints

📝 Disallow conflicting CSS query and HTML form constraints.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Report explicit lower and upper bounds that conflict in CSS media and container queries and HTML form controls, including native JSX/TSX elements. Conflicting bounds often indicate a mistyped breakpoint or attribute value.

The rule does not provide fixes or suggestions because the intended bounds cannot be inferred.

## Examples

### CSS queries

The rule checks flat positive conjunctions in `@media`, `@import`, and `@container`, including `min-`/`max-` features, colon equality, and modern comparisons with the feature on either side. Chained ranges can run in either direction.

```css
/* ❌ */
@media (width > 1000px) and (width < 500px) {}
@media (1000px < width < 500px) {}
@media (500px > width > 1000px) {}
@media (min-width: 1000px) and (max-width: 500px) {}
@media (width >= 500px) and (width < 500px) {}
@container card (inline-size > 1000px) and (inline-size < 500px) {}

/* ✅ */
@media (500px < width < 1000px) {}
@media (width >= 500px) and (width <= 500px) {}
@media (width > 1000px), (width < 500px) {}
@container card (500px < inline-size < 1000px) {}
```

Supported media features are `width`, `height`, `device-width`, `device-height`, `resolution`, `color`, `color-index`, `monochrome`, `horizontal-viewport-segments`, and `vertical-viewport-segments`. Supported container features are `width`, `height`, `inline-size`, and `block-size`. Values must be valid finite numeric literals with matching units. Each comma-separated media query is checked independently, and unrelated features do not prevent checking other bounds in the conjunction.

The rule ignores negation, `or`, grouped conditions, functions such as `calc()`, ratios, keyword values, unknown/vendor features, and custom-media definitions or expansion. It does not convert units, compare unitless zero with dimension values, combine enclosing queries, or infer nonnegative domains or integer gaps. For example, `(1 < color < 2)` is ignored even though `color` is an integer. Extreme numeric precision is unsupported. Range `=` syntax currently receives a parser error; use colon equality for exact-value checks.

Container queries containing style or other function queries are skipped.

### HTML form controls

The rule checks:

- `min` and `max` on `input` elements with type `number` or `range`.
- `minlength` and `maxlength` on `textarea` elements and inputs with type `text`, `search`, `url`, `tel`, `email`, or `password`. Missing or empty input type, including a bare `type` attribute, is treated as `text`.

```html
<!-- ❌ -->
<input type="number" min="10" max="5">
<input minlength="10" maxlength="5">
<textarea minlength="10" maxlength="5"></textarea>

<!-- ✅ -->
<input type="number" min="5" max="10">
<input minlength="5" maxlength="5">
<input type="time" min="23:00" max="01:00">
```

Time inputs intentionally support ranges crossing midnight and are ignored, as are date inputs. The rule compares explicit valid attribute values, including character references and unquoted values. It does not infer default bounds or analyze `step`, `pattern`, or whether a value is required. Disabled and readonly controls are still checked because their explicit bounds conflict. An optional control may remain valid when empty despite conflicting length bounds.

HTML attribute values containing templates are ignored. Elements with templated attribute names are skipped entirely because templates can change the control's type or bounds.

Markup-like text inside `textarea`, `title`, or `iframe` elements is ignored.

In HTML and JSX, checks that depend on a duplicated attribute are skipped.

The HTML parser may absorb the rest of an opening tag after a slash in an unquoted attribute value. Quote values containing slashes so subsequent constraints can be checked.

### JSX and TSX

Native `input` and `textarea` elements are checked using `minLength` and `maxLength`. Literal strings/numbers and safely evaluated static expressions are supported, including preceding constants.

```jsx
// ❌
const minimum = 10;
<input type="number" min={minimum} max={5} />;
<textarea minLength={10} maxLength={5} />;

// ✅
<input type="number" min={5} max={10} />;
<textarea minLength={5} maxLength={10} />;
```

Custom components, JSX spreads, dynamic bounds or input types, mutable bindings, and references to constants before their declarations are ignored. Embedded CSS strings and framework templates are not inspected.

## Language setup

JSX/TSX uses your existing JavaScript/TypeScript parser configuration. To enable the rule for CSS and HTML, configure their language plugins explicitly:

```js
import unicorn from 'eslint-plugin-unicorn';
import css from '@eslint/css';
import html from '@html-eslint/eslint-plugin';

export default [
	{
		files: ['**/*.css'],
		plugins: {unicorn, css},
		language: 'css/css',
		rules: {'unicorn/no-conflicting-constraints': 'error'},
	},
	{
		files: ['**/*.html'],
		plugins: {unicorn, html},
		language: 'html/html',
		rules: {'unicorn/no-conflicting-constraints': 'error'},
	},
];
```

## Related rules

[`no-invalid-media-features`](./no-invalid-media-features.md) validates individual CSS media feature names and values. [`prefer-media-feature-range-syntax`](./prefer-media-feature-range-syntax.md) enforces modern notation. Neither checks relationships between bounds.

HTML ESLint's [`no-invalid-attr-value`](https://html-eslint.org/docs/rules/no-invalid-attr-value) checks individual attribute values, while `no-ineffective-attrs` checks applicability. This rule checks the relationships between valid bounds.
