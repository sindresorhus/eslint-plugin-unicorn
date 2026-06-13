# require-number-to-fixed-digits-argument

📝 Enforce using the digits argument with `Number#toFixed()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When calling [`Number#toFixed()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toFixed), always explicitly specify the `digits` argument. While the default is `0`, explicitly stating it makes the code clearer and less ambiguous about the intended behavior.

## Examples

```js
// ❌
const string = number.toFixed();

// ✅
const string = number.toFixed(0);
```

```js
// ❌
const price = 19.99;
const displayPrice = price.toFixed(); // Unclear intent

// ✅
const price = 19.99;
const displayPrice = price.toFixed(2); // Currency, 2 decimal places
```

```js
// ❌
const average = 95.667;
const rounded = average.toFixed();

// ✅
const average = 95.667;
const rounded = average.toFixed(0); // Round to integer, intention is clear
```

```js
// ✅
const percentage = 87.567;
const display = percentage.toFixed(1); // Display with 1 decimal place
```
