# Prefer the use of `String.slice` instead of `String.substr` or `String.substring`

Prefer a convention of using `String.slice` instead of `String.substr` or `String.substring`. `String.slice()` has clearer behavior and has a counterpart with arrays. It is also better to be consistent. Anything that can be done with `String.substr()` or `String.substring()` can be done with `String.slice()`.

## Fail

```js
const foo = bar.substr(1, 2);
const baz = quux.substring(1, 3);
```

## Pass

```js
const foo = bar.slice(1, 3);
```
