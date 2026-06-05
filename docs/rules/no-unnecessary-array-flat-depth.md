# no-unnecessary-array-flat-depth

📝 Disallow using `1` as the `depth` argument of `Array#flat()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Passing `1` as the `depth` argument to [`Array#flat(depth)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat) is unnecessary.

## Examples

```js
// ❌
foo.flat(1);

// ✅
foo.flat();
```

```js
// ❌
foo?.flat(1);

// ✅
foo?.flat();
```
