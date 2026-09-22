# no-zero-fractions

📝 Require consistent decimal numbers without redundant zeros.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Use a leading zero before the decimal point, and remove redundant trailing fractional zeros and dangling decimal points. For example, prefer `0.5` over `.5`, `1.5` over `1.50`, and `1` over `1.0` or `1.`.

The rule also supports JSON, JSONC, JSON5, TOML, YAML, and CSS. It preserves CSS units (`2.0px` → `2px`, `.5s` → `0.5s`) and TOML/YAML float types (`1.00` → `1.0`). Tagged YAML scalars, strings, `.inf`, and `.nan` are skipped.

## Examples

```js
// ❌
const foo = 1.0;

// ❌
const foo = 1.;

// ✅
const foo = 1;
```

```js
// ❌
const foo = -1.0;

// ✅
const foo = -1;
```

```js
// ❌
const foo = 123_456.000_000;

// ✅
const foo = 123_456;
```

```js
// ❌
const foo = 123.111000000;

// ✅
const foo = 123.111;
```

```js
// ❌
const foo = 123.00e20;

// ✅
const foo = 123e20;
```

```js
// ✅
const foo = 1.1;
```

```js
// ✅
const foo = -1.1;
```

```js
// ✅
const foo = 123.456;
```

```js
// ✅
const foo = 1e3;
```
