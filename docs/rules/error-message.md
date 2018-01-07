# Enforce passing a `message` value when throwing a built-in error object

This rule enforces a `message` value to be passed in when throwing an instance of a built-in `Error` object, which leads to more readable and better debuggable code.


## Fail

```js
throw Error();
```

```js
throw Error('');
```

```js
throw new TypeError();
```

```js
const err = new Error();
throw err;
```


## Pass

```js
throw Error('foo');
```

```js
throw new TypeError('foo');
```

```js
const err = new Error('foo');
throw err;
```
