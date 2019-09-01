# Enforce passing a `message` value when throwing a built-in error

This rule enforces a `message` value to be passed in when throwing an instance of a built-in `Error` object, which leads to more readable and debuggable code.


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
throw error;
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
throw error;
```
