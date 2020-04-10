# Prefer `Set#has()` over `Array#includes()` when checking for existence or non-existence

[`Set#has()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/has) is faster than [`Array#includes()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes).

This rule is fixable.

## Fail

```js
const array = [1, 2, 3];

function hasValue(valueToFind) {
	return array.includes(valueToFind);
}
```

## Pass

```js
const set = new Set([1, 2, 3]);

function hasValue(valueToFind) {
	return set.has(valueToFind);
}
```

```js
const array = [1, 2];

function hasValue(valueToFind) {
	return array.includes(valueToFind);
}

array.push(3);
```
