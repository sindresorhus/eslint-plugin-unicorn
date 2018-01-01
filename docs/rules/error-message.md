# Enforce passing a `message` value when throwing an error

This rule enforces a `message` value to be passed in when throwing an instance of an `Error` object, which leads to more readable code.


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
throw new MyError();
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
