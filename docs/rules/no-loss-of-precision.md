# no-loss-of-precision

📝 Disallow numeric literals that lose precision when represented as IEEE 754 binary64 values.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Reports numeric literals that cannot be round-tripped through an [IEEE 754 binary64](https://en.wikipedia.org/wiki/Double-precision_floating-point_format) number while preserving the precision expressed by the literal. The comparison uses the literal's precision rather than a fixed digit limit, so `0.30000000000000004` is accepted while `1.0000000000000001` is reported.

Decimal literals with more than 100 significant digits are reported because JavaScript's `Number#toPrecision()` cannot compare precision beyond that limit. This matches ESLint's core `no-loss-of-precision` rule.

This rule supports JSON, JSONC, and JSON5 through [`@eslint/json`](https://github.com/eslint/json), TOML through [`eslint-plugin-toml`](https://github.com/ota-meshi/eslint-plugin-toml), and CSS through [`@eslint/css`](https://github.com/eslint/css).

In TOML, only floating-point values are checked. Integers are excluded because TOML defines them separately from floating-point values, the parser exposes their exact value as a `bigint`, and [`toml/precision-of-integer`](https://ota-meshi.github.io/eslint-plugin-toml/rules/precision-of-integer.html) can enforce an implementation-specific integer limit.

In CSS, parsed numbers, dimensions, and percentages are checked. Numeric text in raw syntax, such as custom property values, is ignored.

For JavaScript and TypeScript, use ESLint's core [`no-loss-of-precision`](https://eslint.org/docs/latest/rules/no-loss-of-precision) rule instead.

## Examples

```jsonc
// ❌
{"value": 1.23456789012345678}

// ✅
{"value": 0.30000000000000004}
```

```toml
# ❌
value = 1.0000000000000001

# ✅
value = 1.0000000000000002220446049250313080847263336181640625
```

```css
/* ❌ */
.example { width: 99999999999999999px; }

/* ✅ */
.example { width: 0.30000000000000004px; }
```
