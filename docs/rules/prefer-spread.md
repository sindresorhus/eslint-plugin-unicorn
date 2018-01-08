# Prefer the spread operator over `Array.from()`

Enforces the use of the spread operator over `Array.from()`. This rule adds on to the built-in [prefer-spread](https://eslint.org/docs/rules/prefer-spread) rule, which only flags uses of `.apply()`. Does not enforce for `TypedArray.from()`;


## Fail

```js
Array.from(set).map(() => {});
```


## Pass

```js
[...set].map(() => {});
```
