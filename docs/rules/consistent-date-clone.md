# consistent-date-clone

📝 Prefer passing `Date` directly to the constructor when cloning.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The [`Date` constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date) can clone a `Date` object directly when passed as an argument. This is simpler and more efficient than extracting the timestamp with `.getTime()`.

> Note: This approach requires ES2015 (ES6) or later. In older environments, `new Date(date)` converts to a string first, but modern JavaScript handles this correctly.

## Examples

```js
// ❌
new Date(date.getTime());

// ✅
new Date(date);
```

```js
// ❌
const cloned = new Date(originalDate.getTime());

// ✅
const cloned = new Date(originalDate);
```

```js
// ✅
// When you need just the timestamp value
const timestamp = date.getTime();
```
