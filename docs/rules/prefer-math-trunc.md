# Enforce the use of `Math.trunc` instead of bitwise operators

Enforces a convention of using [`Math.trunc()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc) instead of `| 0` (`bitwise OR` with 0) or `~~x` (two `bitwise NOT`) for clarity and more reliable results.

These hacks helps truncate numbers but they are not clear and do not work in [some cases](https://stackoverflow.com/a/34706108/11687747).

This rule is fixable.

## Fail

```js
const foo = 37.4 | 0;
const foo = ~~37.4;

let foo = 3.3;
foo |= 0;

const foo = 3.3;
const bar = ~~foo;
```

## Pass

```js
const foo = Math.trunc(37.4);
const foo = 3.3 | 1;
const foo = ~3.3;
```
