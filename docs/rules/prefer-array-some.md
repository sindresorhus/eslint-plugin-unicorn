# Prefer `.some(…)` over `.find(…)`.

Prefer using [`Array#some`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some) over [`Array#find`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find) when testing array.

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
while (array.find(element => element === '🦄')) {
	array.shift();
}
```

## Pass

```js
if (array.some(element => element === '🦄')) {
	// …
}
```

```js
const foo = array.some(element => element === '🦄') ? bar : baz;
```

```js
const foo = bar ? array.find(element => element === '🦄') : '';
```

```js
while (array.some(element => element === '🦄')) {
	array.shift();
}
```
