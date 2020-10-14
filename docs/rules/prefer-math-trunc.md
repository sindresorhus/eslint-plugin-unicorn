# Enforce the use of `Math.trunc` instead of bitwise operators

Enforces a convention of using [`Math.trunc()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc) instead of `| 0` ([`bitwise OR`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_OR) with 0) or `~~x` (two [`bitwise NOT`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_NOT)) for clarity and more reliable results.

These hacks help truncate numbers but they are not clear and do not work in [some cases](https://stackoverflow.com/a/34706108/11687747).

This rule is fixable.

## Fail

```js
const foo = 37.4 | 0;
```

```js
const foo = ~~37.4;
```

```js
let foo = 3.3;
foo |= 0;
```

```js
const foo = 3.3;
const bar = ~~foo;
```

## Pass

```js
const foo = Math.trunc(37.4);
```

```js
const foo = 3.3 | 1;
```

```js
let foo = 3.3;
foo = Math.trunc(3.3);
```

```js
const foo = ~3.3;
```
