# Disallow `new Array()`

The ESLint builtin rule [`no-array-constructor`](https://eslint.org/docs/rules/no-array-constructor) enforce use array literal notation instead of use of the `Array` constructor with multiple arguments or no argument.

This rule forbid use the `Array` constructor with **one** argument, it not clear, the argument is the length of array or the only element.

This rule is fixable, if the value of the argument can be calculated.

## Fail

```js
const array = new Array(length);
```

```js
const array = new Array(onlyElement);
```

## Pass

```js
const array = Array.from({length});
```

```js
const array = [onlyElement];
```
