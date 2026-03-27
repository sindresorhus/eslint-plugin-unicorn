# no-unnecessary-slice-end

📝 Disallow using `.length` or `Infinity` as the `end` argument of `{Array,String,TypedArray}#slice()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When calling `{String,Array,TypedArray}#slice(start, end)`, omitting the `end` argument defaults it to the object's `.length`. Passing it explicitly or using `Infinity` is unnecessary.

## Examples

```js
// ❌
const foo = string.slice(1, string.length);

// ✅
const foo = string.slice(1);
```

```js
// ❌
const foo = string.slice(1, Infinity);

// ✅
const foo = string.slice(1);
```

```js
// ❌
const foo = string.slice(1, Number.POSITIVE_INFINITY);

// ✅
const foo = string.slice(1);
```
