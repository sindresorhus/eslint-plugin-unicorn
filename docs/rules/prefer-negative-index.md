# Prefer negative index over `.length - index` for `{String,Array,TypedArray}#slice()`, `Array#splice()` and `Array#at()`

✅ The `"extends": "plugin:unicorn/recommended"` property in a configuration file enables this rule.

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

Prefer negative index over calculating from `.length` for [`String#slice()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/slice), [`Array#slice`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice), [`TypedArray#slice`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/slice) , [`Array#splice()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice) and [`Array#at()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at)

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
