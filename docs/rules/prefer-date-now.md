# prefer-date-now

📝 Prefer `Date.now()` to get the number of milliseconds since the Unix Epoch.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Date.now()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now) is shorter and nicer than [`new Date().getTime()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTime), and avoids unnecessary instantiation of `Date` objects.

## Examples

```js
// ❌
const foo = new Date().getTime();

// ❌
const foo = new Date().valueOf();

// ❌
const foo = +new Date;

// ❌
const foo = Number(new Date());

// ✅
const foo = Date.now();
```

```js
// ❌
const foo = new Date() * 2;

// ✅
const foo = Date.now() * 2;
```
