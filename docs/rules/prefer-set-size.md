<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer use `Set#size` directly instead of convert it to an array, and use `.length` of the array.

## Fail

```js
function isUnique(array) {
	return [...new Set(array)].length === array.length;
}
```

## Pass

```js
function isUnique(array) {
	return new Set(array).size === array.length;
}
```
