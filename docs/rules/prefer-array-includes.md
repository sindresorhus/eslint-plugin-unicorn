# Prefer `Array#includes()` over `Array#some()` when looking for a well known item

[`Array#some()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some) is intended for more complex needs. If you are just looking for the index where the given item is present, then the code can be simplified to use [`Array#includes()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes). This applies to any search with a literal, a variable, or any expression that doesn't have any explicit side effects. However, if the expression you are looking for relies on an item related to the function (its arguments, the function self, etc.), the case is still valid.

This rule is fixable, unless the search expression has side effects.

## Fail

```js
const isFound = foo.some(x => x === 'foo');
```

```js
const isFound = foo.some(x => 'foo' === x);
```

```js
const isFound = foo.some(x => {
	return x === 'foo';
});
```

## Pass

```js
const isFound = foo.includes('foo');
```

```js
const isFound = foo.some(x => x == undefined);
```

```js
const isFound = foo.some(x => x !== 'foo');
```

```js
const isFound = foo.some((x, index) => x === index);
```

```js
const isFound = foo.some(x => (x === 'foo') && isValid());
```

```js
const isFound = foo.some(x => y === 'foo');
```

```js
const isFound = foo.some(x => y.x === 'foo');
```

```js
const isFound = foo.some(x => {
	const bar = getBar();
	return x === bar;
});
```
