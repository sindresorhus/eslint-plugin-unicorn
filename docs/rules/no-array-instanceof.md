# Require  `Array.isArray()` check instead of `instanceof Array`

While the `instanceof Array` works, it is unreliable across environments Eg: multi-frame DOM environments (iframes). Hence, `Array.isArray()` is recommended.

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
