# Enforce the use of `Math.trunc` instead of bitwise operators

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

Enforces a convention of using [`Math.trunc()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc) instead of bitwise operations for clarity and more reliable results.
It prevents the use of the following bitwise operations:

- `x | 0` ([`bitwise OR`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_OR) with 0)
- `~~x` (two [`bitwise NOT`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_NOT))
- `x >> 0` ([`Signed Right Shift`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Right_shift) with 0)
- `x << 0` ([`Left Shift`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Left_shift) with 0)
- `x ^ 0` ([`bitwise XOR Shift`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR) with 0)

These hacks help truncate numbers but they are not clear and do not work in [some cases](https://stackoverflow.com/a/34706108/11687747).

This rule is fixable, unless the left-hand side in assignment has side effect.

## Fail

```js
const foo = 37.4;
console.log(foo | 0);
```

```js
const foo = 37.4;
console.log(~~bar);
```

```js
let foo = 37.4;
foo |= 0;
```

```js
const foo = 37.4;
console.log(foo << 0);
```

```js
const foo = 37.4;
console.log(foo >> 0);
```

```js
const foo = {bar: 37.4};
console.log(foo.bar ^ 0);
```

## Pass

```js
const foo = 37.4;
console.log(Math.trunc(foo));
```

```js
const foo = 37.4;
console.log(foo | 3);
```

```js
let foo = 37.4;
foo = Math.trunc(foo);
```

```js
const foo = 37.4;
console.log(~foo);
```

```js
const foo = 37.4;
console.log(foo >> 3);
```

```js
const foo = 37.4;
console.log(foo << 3);
```

```js
const foo = 37.4;
console.log(foo ^ 3);
```
