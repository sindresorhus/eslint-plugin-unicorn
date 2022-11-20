# Require `Array.isArray()` instead of `instanceof Array`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The `instanceof Array` check doesn't work across realms/contexts, for example, frames/windows in browsers or the `vm` module in Node.js.

## Fail

```js
array instanceof Array;
[1,2,3] instanceof Array;
```

## Pass

```js
Array.isArray(array);
Array.isArray([1,2,3]);
```
