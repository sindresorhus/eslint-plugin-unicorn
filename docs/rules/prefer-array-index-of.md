# Prefer [`Array#indexOf()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf) over [`Array#findIndex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex) when looking for the index of an item

[`Array#findIndex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex) is intended for more complex needs. If you are just looking for the index where the given item is present, then the code can be simplified. This applies to any search with a literal, a variable, or any expression that doesn't have any explicit side effects. However, if the expression you are looking for has explicit side effects, relies on element related to the function (the name of the function, its arguments, etc.), the case is still valid.

This rule is partly fixable.

## Fail

```js
const index = foo.findIndex(x => x === 'foo');
```

```js
const index = foo.findIndex(x => 'foo' === x);
```

```js
const index = foo.findIndex(x => {
	return x === 'foo';
});
```

## Pass

```js
const index = foo.indexOf('foo');
```

```js
const index = foo.findIndex(x => x == undefined);
```

```js
const index = foo.findIndex(x => x !== 'foo');
```

```js
const index = foo.findIndex((x, index) => x === index);
```

```js
const index = foo.findIndex(x => (x === 'foo') && isValid());
```

```js
const index = foo.findIndex(x => y === 'foo');
```

```js
const index = foo.findIndex(x => y.x === 'foo');
```

```js
const index = foo.findIndex(x => {
	const bar = getBar();
	return x === bar;
});
```
