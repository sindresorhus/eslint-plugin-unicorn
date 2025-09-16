# Disallow awaiting non-promise values

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The [`await` operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await) should only be used on [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) values.

## Examples

```js
// ❌
await await promise;

// ✅
await promise;
```

```js
// ❌
await [promise1, promise2];

// ✅
await Promise.allSettled([promise1, promise2]);
```
