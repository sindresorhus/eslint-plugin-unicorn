# Disallow using `.length` as the `end` argument of `{Array,String,TypedArray}#slice()`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When calling `{String,Array,TypedArray}#slice(start, end)`, omitting the `end` argument defaults it to the object's `.length`. Passing it explicitly is unnecessary.

## Fail

```js
const foo = string.slice(1, string.length);
```

```js
const foo = array.slice(1, array.length);
```

## Pass

```js
const foo = string.slice(1);
```

```js
const foo = bar.slice(1, baz.length);
```
