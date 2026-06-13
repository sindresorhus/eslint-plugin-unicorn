# prefer-bigint-literals

📝 Prefer `BigInt` literals over the constructor.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`BigInt` literals (with the `n` suffix) are more concise and efficient than calling the `BigInt()` constructor. Literals are evaluated at parse time, while constructor calls happen at runtime.

## Examples

```js
// ❌ - Constructor call
const bigint = BigInt(1);

// ✅ - Literal is more concise
const bigint = 1n;
```

```js
// ❌
const large = BigInt('9007199254740991');

// ✅
const large = 9007199254740991n;
```

```js
// ❌
const hex = BigInt('0xFF');

// ✅
const hex = 0xFFn;
```

```js
// ✅ - When you need to compute the value dynamically
const computed = BigInt(getSomeNumber());
```

```js
// ✅ - When working with very large numbers
const astronomicalNumber = 999999999999999999999999n;
```
