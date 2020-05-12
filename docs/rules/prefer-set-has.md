# Prefer `Set#has()` over `Array#includes()` when checking for existence or non-existence

[`Set#has()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/has) is faster than [`Array#includes()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes).

This rule is fixable.

## Fail

```js
const array = [1, 2, 3];
const hasValue = value => array.includes(value);
```

## Pass

```js
const set = new Set([1, 2, 3]);
const hasValue = value => set.has(value);
```

```js
// This array is not only checking existence.
const array = [1, 2];
const hasValue = value => array.includes(value);
array.push(3);
```

```js
// This array is only checked once.
const array = [1, 2, 3];
const hasOne = array.includes(1);
```
