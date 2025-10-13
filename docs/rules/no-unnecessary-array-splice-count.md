# Disallow using `.length` or `Infinity` as the `deleteCount` or `skipCount` argument of `Array#{splice,toSpliced}()`

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- Remove this comment, add more detailed description. -->

When calling [`Array#splice(start, deleteCount)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice) and [`Array#toSpliced(start, skipCount)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSpliced), omitting the `deleteCount` and `skipCount` argument will delete or skip all elements after `start`. Using `.length` or `Infinity` is unnecessary.

## Examples

```js
// ❌
const foo = array.toSpliced(1, string.length);

// ✅
const foo = array.toSpliced(1);
```

```js
// ❌
const foo = array.toSpliced(1, Infinity);

// ✅
const foo = array.toSpliced(1);
```

```js
// ❌
const foo = array.toSpliced(1, Number.POSITIVE_INFINITY);

// ✅
const foo = array.toSpliced(1);
```

```js
// ❌
array.splice(1, string.length);

// ✅
array.splice(1);
```

```js
// ❌
array.splice(1, Infinity);

// ✅
array.splice(1);
```

```js
// ❌
array.splice(1, Number.POSITIVE_INFINITY);

// ✅
array.splice(1);
```
