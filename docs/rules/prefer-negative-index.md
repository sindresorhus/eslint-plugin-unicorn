# Prefer `-n` over `.length - n` for `slice` and `splice`

Prefer negative index over calculating from `length` for `slice` and `splice`

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
