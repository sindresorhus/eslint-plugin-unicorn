# Enforce the use of `new RegExp()` instead of `RegExp()`

They work the same, but `new RegExp()` should be preferred for consistency with other constructors.


## Fail

```js
const regexp = RegExp('foo');
```


## Pass

```js
const regexp = new RegExp('foo');
```
