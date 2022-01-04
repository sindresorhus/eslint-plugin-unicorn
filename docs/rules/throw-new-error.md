# Require `new` when throwing an error

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

While it's possible to create a new error without using the `new` keyword, it's better to be explicit.

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
