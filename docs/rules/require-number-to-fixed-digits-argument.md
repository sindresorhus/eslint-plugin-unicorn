# Enforce using the digits argument with `Number#toFixed()`

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

It's better to make it clear what the value of the `digits` argument is when calling [Number#toFixed()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toFixed), instead of relying on the default value of `0`.

## Examples

```js
// ❌
const string = number.toFixed();

// ✅
const string = number.toFixed(0);
```

```js
// ✅
const string = number.toFixed(2);
```
