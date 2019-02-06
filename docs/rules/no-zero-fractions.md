# Disallow number literals with zero fractions or dangling dots

Disallows number literals with zero fractions or dangling dots, as there is no difference in JS between one having it and one not having it.

## Fail

```js
const foo = 1.0;
const foo = -1.0;
const foo = 123123123.0;
const foo = 1.;
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
