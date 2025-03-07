# Prefer passing `Date` directly to the constructor when cloning

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The [`Date` constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date) can clone a `⁠Date` object directly when passed as an argument, making timestamp conversion unnecessary.

> Note: Before ES2015, `new Date(date)` converted `date` to a string first, so it's not safe to clone.

## Examples

```js
// ❌
new Date(date.getTime());

// ✅
new Date(date);
```
