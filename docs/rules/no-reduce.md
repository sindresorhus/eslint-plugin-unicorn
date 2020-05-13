# Disallow the usage of `Array#reduce()` and `Array#reduceRight()`

`Array#reduce()` and `Array#reduceRight()` usually results in hard-to-read code. It can almost every time by replaced with `.map`, `.filter`. Only in the rare case of summing up the array it is useful.

Use `eslint-disable` comment if you really need to use it.

This rule is not fixable.

## Fail

```js
array.reduce(reducer, initialValue);
```

```js
array.reduceRight(reducer, initialValue);
```

```js
array.reduce(reducer);
```

```js
[].reduce.call(array, reducer);
```

```js
[].reduce.apply(array, [reducer, initialValue]);
```

```js
Array.prototype.reduce.call(array, reducer);
```

## Pass

```js
// eslint-disable-next-line
array.reduce(reducer, initialValue);
```

```js
let result = initialValue;

for (const element of array) {
	result += element;
}
```
