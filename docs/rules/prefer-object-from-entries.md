# Prefer use `Object.fromEntries(…)` to transform a list of key-value pairs into an object

`Object.fromEntries(…)` is designed for this pattern.

This rule is fixable.

## Fail

```js
const foo = 'unicorn';
```

## Pass

```js
const foo = '🦄';
```
