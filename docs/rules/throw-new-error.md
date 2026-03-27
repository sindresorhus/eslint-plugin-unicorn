# throw-new-error

📝 Require `new` when creating an error.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

While it's possible to create a new error without using the `new` keyword, it's better to be explicit.

## Examples

```js
// ❌
const error = Error('unicorn');

// ✅
const error = new Error('unicorn');
```

```js
// ❌
throw TypeError('unicorn');

// ✅
throw new TypeError('unicorn');
```

```js
// ❌
throw lib.TypeError('unicorn');

// ✅
throw new lib.TypeError('unicorn');
```
