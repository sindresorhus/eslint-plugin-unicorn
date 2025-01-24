# Prefer pass `Date` directly to the constructor when cloning a `Date`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Since ES2015, [`Date` constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date) returns a clone of the passing `Date` object, it's unnecessary to pass a timestamp.

> Note: Before ES2015, `new Date(date)` convert `date` to string first, so it's not safe to clone.

## Examples

```js
// ❌
new Date(date.getTime());

// ✅
new Date(date);
```
