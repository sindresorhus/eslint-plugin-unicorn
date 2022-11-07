# Prefer negative index over `.length - index` for `{String,Array,TypedArray}#{slice,at}()` and `Array#splice()`

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer negative index over calculating from `.length` for [`String#slice()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/slice), [`Array#slice()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice), [`TypedArray#slice()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/slice), [`String#at()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/at), [`Array#at()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at), [`TypedArray#at()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/at), and [`Array#splice()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice)

## Fail

```js
foo.slice(foo.length - 2, foo.length - 1);
```

```js
foo.splice(foo.length - 1, 1);
```

```js
foo.at(foo.length - 1);
```

```js
Array.prototype.slice.call(foo, foo.length - 2, foo.length - 1);
```

```js
Array.prototype.slice.apply(foo, [foo.length - 2, foo.length - 1]);
```

## Pass

```js
foo.slice(-2, -1);
```

```js
foo.splice(-1, 1);
```

```js
foo.at(-1);
```

```js
Array.prototype.slice.call(foo, -2, -1);
```

```js
Array.prototype.slice.apply(foo, [-2, -1]);
```

## Related rules

- [unicorn/prefer-at](./prefer-at.md)
