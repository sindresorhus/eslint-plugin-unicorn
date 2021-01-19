# Prefer the spread operator over `Array.from()` and `Array#concat()`

Enforces the use of the spread operator over `Array.from()` and `Array#concat()`. This rule adds on to the built-in [prefer-spread](https://eslint.org/docs/rules/prefer-spread) rule, which only flags uses of `.apply()`. Does not enforce for `TypedArray.from()`;

This rule is partly fixable.

## Fail

```js
Array.from(set).map(element => foo(element));
```

```js
const array = array1.concat(array2);
```

## Pass

```js
[...set].map(element => foo(element));
```

```js
const array = [...array1, ...array2];
```
