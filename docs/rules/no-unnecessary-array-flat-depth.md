# Disallow using `1` as the `depth` argument of `Array#flat()`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Passing explicit `1` as `depth` argument of [`Array#flat(depth)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat) is unnecessary.

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
