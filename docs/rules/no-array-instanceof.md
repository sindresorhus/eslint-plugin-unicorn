# Require `Array.isArray()` instead of `instanceof Array`

The `instanceof Array` check doesn't work across realms/contexts, for example, frames/windows in browsers or the `vm` module in Node.js.

This rule is fixable.


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
