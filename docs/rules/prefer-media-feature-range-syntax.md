# prefer-media-feature-range-syntax

📝 Prefer modern media feature range syntax.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The [Media Queries Level 4 range syntax](https://www.w3.org/TR/mediaqueries-4/#mq-range-context) makes comparisons easier to read by placing the media feature and its value in mathematical order. It is [supported in modern browsers](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries#creating_complex_media_queries) and avoids the legacy `min-` and `max-` prefixes.

This rule checks standardized range media features in `@media` rules. It only supports CSS parsed with `@eslint/css`; preprocessors such as SCSS and other contexts such as `@container`, `@import`, and `@custom-media` are not checked.

## Examples

Single bounds are automatically fixed without changing their meaning:

```css
/* ❌ */
@media (min-width: 500px) {}

/* ✅ */
@media (width >= 500px) {}
```

```css
/* ❌ */
@media (max-width: 999px) {}

/* ✅ */
@media (width <= 999px) {}
```

Directly adjacent lower and upper bounds for the same feature are combined into one editor suggestion. They are not changed by `--fix`:

```css
/* ❌ */
@media (min-width: 30em) and (max-width: 50em) {}

/* ✅ */
@media (30em <= width <= 50em) {}
```

When the maximum is a nonnegative safe integer written in decimal notation with a pixel unit, the suggestion uses the common half-open breakpoint form:

```css
/* ❌ */
@media (min-width: 500px) and (max-width: 999px) {}

/* ✅ */
@media (500px <= width < 1000px) {}
```

The integer-pixel suggestion intentionally expands the range to include fractional values between `999px` and `1000px`. Because that can change behavior, it is only offered as a suggestion. Other values use an exact inclusive range.
