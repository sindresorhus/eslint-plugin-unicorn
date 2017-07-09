# Enforce the use of `new RegExp()` instead of `RegExp`


## Fail

```js
const regexp = RegExp('foo', 'g');
```


## Pass

```js
const regexp = new RegExp('foo', 'g');
```

