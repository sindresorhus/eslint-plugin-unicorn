# Require `new` when throwing an error

While it's possible to create a new error without using the `new` keyword, it's better to be explicit.

This rule is fixable.

## Fail

```js
throw Error();
```

```js
throw TypeError('unicorn');
```

```js
throw lib.TypeError();
```

## Pass

```js
throw new Error();
```

```js
throw new TypeError('unicorn');
```

```js
throw new lib.TypeError();
```
