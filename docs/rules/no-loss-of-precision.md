# no-loss-of-precision

📝 Disallow numeric literals that lose precision when represented as IEEE 754 binary64 values.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Reports numeric literals that lose their written precision when converted to [IEEE 754 binary64](https://en.wikipedia.org/wiki/Double-precision_floating-point_format). This checks round-tripping, not a fixed digit limit. Decimal literals exceeding 100 significant digits are reported because `Number#toPrecision()` cannot compare them.

Supports JSON, JSONC, JSON5, TOML floats, and parsed CSS numbers, dimensions, and percentages. TOML integers and raw CSS values, including custom properties, are ignored. For JavaScript and TypeScript, use ESLint's core [`no-loss-of-precision`](https://eslint.org/docs/latest/rules/no-loss-of-precision) rule.

## Examples

```jsonc
// ❌
{"value": 1.23456789012345678}

// ✅
{"value": 0.30000000000000004}
```
