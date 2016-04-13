# Require `new` when throwing an error

While it's possible to create a new error without using the `new` keyword, it's better to be explicit.


## Fail

```js
throw Error();
throw TypeError('unicorn');
```


## Pass

```js
throw new Error();
throw new TypeError('unicorn');
```
