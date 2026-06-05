# no-zero-fractions

📝 Disallow number literals with zero fractions or dangling dots.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

There is no difference in JavaScript between, for example, `1`, `1.0` and `1.`, so prefer the former for consistency and brevity.

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
