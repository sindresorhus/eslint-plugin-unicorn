# Prefer `Number.isInteger()` for integer checking

Enforces the use of [Number.isInteger()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger) for checking if a number is an integer.

These different implementations have slightly different behaviours.

For example:

```js
let number = [['1']];

number % 1 === 0; // true
```

Due to the difference in behaviours across the different implementations, this rule is fixable via the suggestions API.

## Fail

```js
(value^0) === value
(value | 0) === value
Math.round(value) === value
parseInt(value, 10) === value
~~value === value

// these will all trigger the lint warning
_.isInteger(value);
lodash.isInteger(value);
underscore.isInteger(value);
```

## Pass

```js
Number.isInteger(value);
```
