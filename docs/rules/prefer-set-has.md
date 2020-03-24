# Prefer `Set#has()` over `Array#includes()` when checking for existence or non-existence

[`Set#has()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/has) is faster than [`Array#includes()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes).

This rule is fixable.

## Fail

```js
const array = [1, 2, 3];

function isExists(find) {
	return array.includes(find);
}
```

## Pass

```js
const set = new Set([1, 2, 3]);

function isExists(find) {
	return set.has(find);
}
```

```js
const array = [1, 2];

function isExists(find) {
	return array.includes(find);
}

array.push(3);
```
