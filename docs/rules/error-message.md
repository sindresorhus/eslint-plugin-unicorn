# Enforce passing a `message` value when creating a built-in error

This rule enforces a `message` value to be passed in when creating an instance of a built-in [`Error`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) object, which leads to more readable and debuggable code.


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
const error = new Error();
```


## Pass

```js
throw Error('Foo');
```

```js
throw new TypeError('Foo');
```

```js
const error = new Error('Foo');
```
