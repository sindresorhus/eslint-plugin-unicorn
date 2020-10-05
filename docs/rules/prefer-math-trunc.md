# Enforce the use of `Math.trunc` instead of `| 0`

Enforces a convention of using [`Math.trunc()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc) instead of `| 0` (bitwise OR with 0) for clarity and more reliable results.

The `| 0` hack helps truncate numbers but is not clear and does not work in [some cases](https://stackoverflow.com/a/34706108/11687747).

This rule is fixable.

## Fail

```js
const foo = 37.4 | 0;

let foo = 3.3
foo |= 0;
```

## Pass

```js
const foo = Math.trunc(37.4);
const foo = 3.3 | 1;
```
