# Enforce passing a `message` value when creating a built-in error

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*
<!-- /RULE_NOTICE -->

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
