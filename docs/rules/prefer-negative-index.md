# Prefer negative index over `.length - index` for `{String,Array,TypedArray}#slice()` and `Array#splice()`

Prefer negative index over calculating from `.length` for [`String#slice()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/slice), [`Array#slice`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice), [`TypedArray#slice`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/slice) and [`Array#splice()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice)

This rule is fixable.

## Fail

```js
foo.slice(foo.length - 2, foo.length - 1);
foo.splice(foo.length - 1, 1);
Array.prototype.slice.call(foo, foo.length - 2, foo.length - 1);
Array.prototype.slice.apply(foo, [foo.length - 2, foo.length - 1]);
```

## Pass

```js
foo.slice(-2, -1);
foo.splice(-1, 1);
Array.prototype.slice.call(foo, -2, -1);
Array.prototype.slice.apply(foo, [-2, -1]);
```
