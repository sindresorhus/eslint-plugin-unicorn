# Require `new` when throwing an error


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
