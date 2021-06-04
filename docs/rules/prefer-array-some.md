# Prefer `.some(…)` over `.filter(…).length` check and `.find(…)`

Prefer using [`Array#some`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some) over:

- Non-zero length check on the result of [`Array#filter()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter).
- Using [`Array#find()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find) to ensure at least one element in the array passes a given check.

This rule is fixable for `.filter(…).length` check and has a suggestion for `.find(…)`.

## Fail

```js
const hasUnicorn = array.filter(element => isUnicorn(element)).length > 0;
```

```js
const hasUnicorn = array.filter(element => isUnicorn(element)).length != 0;
```

```js
const hasUnicorn = array.filter(element => isUnicorn(element)).length >= 1;
```

```js
if (array.find(element => isUnicorn(element))) {
	// …
}
```

```js
const foo = array.find(element => isUnicorn(element)) ? bar : baz;
```

## Pass

```js
const hasUnicorn = array.some(element => isUnicorn(element));
```


```js
if (array.some(element => isUnicorn(element))) {
	// …
}
```

```js
const foo = array.find(element => isUnicorn(element)) || bar;
```
