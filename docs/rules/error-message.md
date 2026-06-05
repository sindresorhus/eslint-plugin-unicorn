# error-message

📝 Enforce passing a `message` value when creating a built-in error.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces a `message` value to be passed in when creating an instance of a built-in [`Error`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) object, which leads to more readable and debuggable code.

## Examples

```js
// ❌
throw new Error();

// ❌
throw new Error('');

// ✅
throw new Error('Unexpected property.');
```

```js
// ❌
throw new TypeError();

// ✅
throw new TypeError('Array expected.');
```

```js
// ❌
const error = new AggregateError(errors);

// ✅
const error = new AggregateError(errors, 'Promises rejected.');
```

```js
// ❌
const error = new SuppressedError(error, suppressed);

// ✅
const error = new SuppressedError(error, suppressed, 'This is a suppressed error.');
```
