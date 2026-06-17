# prefer-global-number-constants

📝 Prefer global numeric constants over `Number` static properties.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`NaN`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NaN), [`Infinity`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Infinity), and `-Infinity` are shorter and easier to read than their equivalent `Number` static properties.

The `Number.NaN` and `Number.POSITIVE_INFINITY` cases are automatically fixed when the replacement global is not shadowed. `Number.NEGATIVE_INFINITY` is reported without an autofix to avoid changing parsing in statement-leading and chained expressions.

## Examples

```js
// ❌
const foo = Number.NaN;

// ✅
const foo = NaN;
```

```js
// ❌
const foo = Number.POSITIVE_INFINITY;

// ✅
const foo = Infinity;
```

```js
// ❌
const foo = Number.NEGATIVE_INFINITY;

// ✅
const foo = -Infinity;
```

> [!CAUTION]
> This rule enforces the opposite of the `checkNaN` and `checkInfinity` options of [`prefer-number-properties`](./prefer-number-properties.md). If you prefer the `Number.NaN`, `Number.POSITIVE_INFINITY`, and `Number.NEGATIVE_INFINITY` forms instead, disable this rule and enable those options.
