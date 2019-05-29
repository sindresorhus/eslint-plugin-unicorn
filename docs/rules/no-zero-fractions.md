# Disallow number literals with zero fractions or dangling dots

There is no difference in JavaScript between, for example, `1`, `1.0` and `1.`, so prefer the former for consistency.

This rule is fixable.


## Fail

```js
const foo = 1.0;
const foo = -1.0;
const foo = 123123123.0;
const foo = 1.;
const foo = 123.111000000;
const foo = 123.00e20;
```


## Pass

```js
const foo = 1;
const foo = -1;
const foo = 123123123;
const foo = 1.1;
const foo = -1.1;
const foo = 123123123.4;
const foo = 1e3;
```
