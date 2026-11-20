# prefer-string-coercion

📝 Prefer `String()` for decimal string conversion of numbers.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`String(value)` puts the conversion first and follows the same pattern as `Number(value)` and `Boolean(value)`. Use `.toString(radix)` to specify a base.

The rule targets `number`, `bigint`, and their unions because both forms produce the same decimal text for numeric primitives. Objects can customize conversion and produce different results.

It checks zero-argument `.toString()` calls, including bracket notation with a literal method name. Optional chaining and explicit type arguments are allowed.

Type-checked linting uses inferred and narrowed types and only reports calls that return plain `string`.

## Examples

```js
// ❌
const label = (42).toString();

// ✅
const label = String(42);
```

```js
// ❌
const id = (123n).toString();

// ✅
const id = String(123n);
```

```js
// ✅
const hex = (255).toString(16);
```

```js
// ✅
const text = url.toString();
```
