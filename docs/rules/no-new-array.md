# Disallow `new Array()`

The ESLint builtin rule [`no-array-constructor`](https://eslint.org/docs/rules/no-array-constructor) enforce use array literal notation instead of use of the `Array` constructor, but it allow use the `Array` constructor with **one** argument, this rule fills that gap.

When use the `Array` constructor with one argument, it not clear that the argument is the length of array or the only element.

This rule is fixable, if the value type of the argument is known.

## Fail

```js
const array = new Array(length);
```

```js
const array = new Array(onlyElement);
```

```js
const array = new Array(...unknownArgumentsList);
```

## Pass

```js
const array = Array.from({length});
```

```js
const array = [onlyElement];
```

```js
const array = [...items];
```
