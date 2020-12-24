# Prefer `.some(…)` over `.find(…)`.

Prefer using [`Array#some`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some) over [`Array#find`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find) when ensuring at least one element in the array passes a given check.

## Fail

```js
if (array.find(element => element === '🦄')) {
	// …
}
```

```js
const foo = array.find(element => element === '🦄') ? bar : baz;
```

```js
const foo = array.find(element => element === '🦄') || bar;
```

## Pass

```js
if (array.some(element => element === '🦄')) {
	// …
}
```
