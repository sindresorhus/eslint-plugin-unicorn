# Enforce passing a `message` value when creating a built-in error

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

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
const error = new AggregateError(errors);
```

## Pass

```js
throw Error('Unexpected property.');
```

```js
throw new TypeError('Array expected.');
```

```js
const error = new AggregateError(errors, 'Promises rejected.');
```
